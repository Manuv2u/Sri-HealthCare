#!/usr/bin/env bash
# =============================================================================
# provision-oci.sh — Full OCI Always Free infrastructure provisioning
#
# Creates from scratch:
#   VCN → Internet Gateway → Route Table → Security List → Subnet
#   SSH key pair → Ubuntu 22.04 ARM Compute Instance → Public IP
#   Bootstraps server (Docker, PostgreSQL, cron, firewall)
#
# Usage:
#   ./provision-oci.sh              # Full provision + server bootstrap
#   ./provision-oci.sh --infra-only # OCI resources only, skip server setup
#   ./provision-oci.sh --skip-infra # Skip OCI resources, only bootstrap server
#
# Idempotent: safe to re-run. Reads .oci-state.json and reuses existing
# resources rather than creating duplicates.
#
# Prerequisites:
#   - OCI CLI installed and configured  (oci setup config)
#   - jq installed                      (brew install jq  or  apt install jq)
# =============================================================================
set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
log()     { echo -e "${BLUE}[provision]${NC} $*"; }
success() { echo -e "${GREEN}[✔]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✘]${NC} $*" >&2; }
step()    { echo -e "\n${BOLD}${CYAN}▶ $*${NC}"; }

# ── Flags ─────────────────────────────────────────────────────────────────────
INFRA_ONLY=false
SKIP_INFRA=false
for arg in "$@"; do
  case $arg in
    --infra-only) INFRA_ONLY=true ;;
    --skip-infra) SKIP_INFRA=true ;;
    *) error "Unknown flag: $arg"; echo "Usage: $0 [--infra-only|--skip-infra]"; exit 1 ;;
  esac
done

# ── Constants ─────────────────────────────────────────────────────────────────
STATE_FILE=".oci-state.json"
KEYS_DIR="./keys"
KEY_FILE="$KEYS_DIR/oci_vm_key"
KEY_PUB="$KEYS_DIR/oci_vm_key.pub"
DEPLOY_CONF="deploy/.deploy.conf"
DEPLOY_ENV="deploy/.env.production"

VM_DISPLAY_NAME="sri-diagnostics"
VCN_NAME="sri-diagnostics-vcn"
VCN_CIDR="10.0.0.0/16"
SUBNET_CIDR="10.0.0.0/24"
IGW_NAME="sri-diagnostics-igw"
SUBNET_NAME="sri-diagnostics-subnet"
SHAPE="VM.Standard.A1.Flex"
SHAPE_OCPUS=4
SHAPE_MEMORY=24
BOOT_VOLUME_GB=100
VM_USER="ubuntu"
DEPLOY_DIR="/opt/sri-diagnostics"

# ── OCI CLI profile (override with OCI_CLI_PROFILE env var) ───────────────────
OCI_PROFILE="${OCI_CLI_PROFILE:-DEFAULT}"

# Helper: run OCI CLI with chosen profile
oci_cli() { oci --profile "$OCI_PROFILE" "$@"; }

# ── Helpers ───────────────────────────────────────────────────────────────────
is_ocid() { [[ -n "${1:-}" && "${1:-}" != "null" && "${1:-}" == ocid1.* ]]; }

# Read a field from state file
state_get() { [[ -f "$STATE_FILE" ]] && jq -r ".${1} // empty" "$STATE_FILE" || echo ""; }

# Write / update a field in state file
state_set() {
  local key="$1" val="$2"
  if [[ -f "$STATE_FILE" ]]; then
    local tmp; tmp=$(jq --arg k "$key" --arg v "$val" '.[$k] = $v' "$STATE_FILE")
    echo "$tmp" > "$STATE_FILE"
  fi
}

# ── Pre-flight checks ─────────────────────────────────────────────────────────
step "Pre-flight checks"

if ! command -v oci &>/dev/null; then
  error "OCI CLI not found."
  echo ""
  echo "  Install it with:"
  echo "    bash -c \"\$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)\""
  echo "  Then configure:"
  echo "    oci setup config"
  exit 1
fi
success "OCI CLI found ($(oci --version 2>/dev/null | head -1))"

if ! command -v jq &>/dev/null; then
  error "jq not found."
  echo "  Install: brew install jq  (macOS)  or  sudo apt-get install -y jq  (Linux)"
  exit 1
fi
success "jq found ($(jq --version))"

OCI_CONFIG="${OCI_CLI_CONFIG_FILE:-$HOME/.oci/config}"
if [[ ! -f "$OCI_CONFIG" ]]; then
  error "OCI config not found at $OCI_CONFIG"
  echo ""
  echo "  Run: oci setup config"
  echo "  You will need:"
  echo "    - Your OCI user OCID       (Identity → Users → User details → OCID)"
  echo "    - Your tenancy OCID        (Profile menu → Tenancy)"
  echo "    - Your region              (top-right of OCI Console, e.g. ap-mumbai-1)"
  exit 1
fi
success "OCI config found at $OCI_CONFIG"

# Verify credentials work
if ! oci_cli iam region list --output table &>/dev/null; then
  error "OCI CLI credentials test failed."
  echo "  Check your ~/.oci/config — key fingerprint and key file must be correct."
  echo "  Test with: oci iam region list"
  exit 1
fi
success "OCI credentials verified"

# ── Read config values ────────────────────────────────────────────────────────
# Extract from OCI config file (handles [profile] sections)
oci_config_get() {
  local key="$1"
  awk "/^\[${OCI_PROFILE}\]/{found=1} found && /^${key}[[:space:]]*=/{print; exit}" "$OCI_CONFIG" \
    | cut -d= -f2 | tr -d ' '
}

TENANCY_OCID=$(oci_config_get "tenancy")
REGION=$(oci_config_get "region")

if [[ -z "$TENANCY_OCID" ]]; then
  error "Could not read tenancy OCID from $OCI_CONFIG (profile [$OCI_PROFILE])"
  exit 1
fi
if [[ -z "$REGION" ]]; then
  error "Could not read region from $OCI_CONFIG (profile [$OCI_PROFILE])"
  exit 1
fi

# Use tenancy root as compartment (works for Always Free; change if needed)
COMPARTMENT_ID="$TENANCY_OCID"

log "Tenancy : $TENANCY_OCID"
log "Region  : $REGION"
log "Profile : $OCI_PROFILE"

# ── SSH Key Generation ────────────────────────────────────────────────────────
step "SSH key pair"

mkdir -p "$KEYS_DIR"
chmod 700 "$KEYS_DIR"

if [[ -f "$KEY_FILE" && -f "$KEY_PUB" ]]; then
  success "SSH keys already exist at $KEYS_DIR/"
else
  log "Generating ed25519 SSH key pair…"
  ssh-keygen -t ed25519 -f "$KEY_FILE" -N "" -C "sri-diagnostics-oci"
  chmod 600 "$KEY_FILE"
  chmod 644 "$KEY_PUB"
  success "SSH keys created:"
  log "  Private: $KEY_FILE"
  log "  Public : $KEY_PUB"
fi

SSH_PUB_KEY=$(cat "$KEY_PUB")
SSH_OPTS="-i $KEY_FILE -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10"

# ── Skip infra if requested ───────────────────────────────────────────────────
if [[ "$SKIP_INFRA" == true ]]; then
  log "--skip-infra: loading state from $STATE_FILE"
  PUBLIC_IP=$(state_get "public_ip")
  INSTANCE_ID=$(state_get "instance_id")
  if [[ -z "$PUBLIC_IP" || -z "$INSTANCE_ID" ]]; then
    error "No valid state found in $STATE_FILE. Run without --skip-infra first."
    exit 1
  fi
  log "Using existing VM: $PUBLIC_IP ($INSTANCE_ID)"
else

# =============================================================================
# INFRASTRUCTURE PROVISIONING
# =============================================================================

# ── VCN ────────────────────────────────────────────────────────────────────────
step "VCN"
VCN_ID=$(state_get "vcn_id")
if ! is_ocid "$VCN_ID"; then
  # Check if already exists by name (re-run safety)
  VCN_ID=$(oci_cli network vcn list \
    --compartment-id "$COMPARTMENT_ID" \
    --display-name "$VCN_NAME" \
    --lifecycle-state AVAILABLE \
    --query 'data[0].id' --raw-output 2>/dev/null || echo "")

  if ! is_ocid "$VCN_ID"; then
    log "Creating VCN ($VCN_NAME)…"
    VCN_ID=$(oci_cli network vcn create \
      --compartment-id "$COMPARTMENT_ID" \
      --cidr-block "$VCN_CIDR" \
      --display-name "$VCN_NAME" \
      --dns-label "sridiag" \
      --wait-for-state AVAILABLE \
      --query 'data.id' --raw-output)
    success "VCN created: $VCN_ID"
  else
    success "VCN already exists: $VCN_ID"
  fi
  state_set "vcn_id" "$VCN_ID"
else
  success "VCN loaded from state: $VCN_ID"
fi

# ── Internet Gateway ──────────────────────────────────────────────────────────
step "Internet Gateway"
IGW_ID=$(state_get "igw_id")
if ! is_ocid "$IGW_ID"; then
  IGW_ID=$(oci_cli network internet-gateway list \
    --compartment-id "$COMPARTMENT_ID" \
    --vcn-id "$VCN_ID" \
    --display-name "$IGW_NAME" \
    --lifecycle-state AVAILABLE \
    --query 'data[0].id' --raw-output 2>/dev/null || echo "")

  if ! is_ocid "$IGW_ID"; then
    log "Creating Internet Gateway…"
    IGW_ID=$(oci_cli network internet-gateway create \
      --compartment-id "$COMPARTMENT_ID" \
      --vcn-id "$VCN_ID" \
      --is-enabled true \
      --display-name "$IGW_NAME" \
      --wait-for-state AVAILABLE \
      --query 'data.id' --raw-output)
    success "Internet Gateway created: $IGW_ID"
  else
    success "Internet Gateway already exists: $IGW_ID"
  fi
  state_set "igw_id" "$IGW_ID"
else
  success "Internet Gateway loaded from state: $IGW_ID"
fi

# ── Route Table (update default) ──────────────────────────────────────────────
step "Route Table"
RT_ID=$(state_get "route_table_id")
if ! is_ocid "$RT_ID"; then
  RT_ID=$(oci_cli network route-table list \
    --compartment-id "$COMPARTMENT_ID" \
    --vcn-id "$VCN_ID" \
    --query 'data[0].id' --raw-output)
  state_set "route_table_id" "$RT_ID"
fi

log "Updating route table with 0.0.0.0/0 → IGW…"
oci_cli network route-table update \
  --rt-id "$RT_ID" \
  --route-rules "[{\"cidrBlock\":\"0.0.0.0/0\",\"networkEntityId\":\"$IGW_ID\"}]" \
  --force \
  --wait-for-state AVAILABLE \
  --query 'data.id' --raw-output > /dev/null
success "Route table configured: $RT_ID"

# ── Security List ─────────────────────────────────────────────────────────────
step "Security List"
SL_ID=$(state_get "security_list_id")
if ! is_ocid "$SL_ID"; then
  SL_ID=$(oci_cli network security-list list \
    --compartment-id "$COMPARTMENT_ID" \
    --vcn-id "$VCN_ID" \
    --query 'data[0].id' --raw-output)
  state_set "security_list_id" "$SL_ID"
fi

INGRESS_RULES=$(cat << 'JSON'
[
  {
    "isStateless": false,
    "protocol": "6",
    "source": "0.0.0.0/0",
    "sourceType": "CIDR_BLOCK",
    "description": "SSH",
    "tcpOptions": {"destinationPortRange": {"min": 22, "max": 22}}
  },
  {
    "isStateless": false,
    "protocol": "6",
    "source": "0.0.0.0/0",
    "sourceType": "CIDR_BLOCK",
    "description": "HTTP (frontend)",
    "tcpOptions": {"destinationPortRange": {"min": 80, "max": 80}}
  },
  {
    "isStateless": false,
    "protocol": "6",
    "source": "0.0.0.0/0",
    "sourceType": "CIDR_BLOCK",
    "description": "HTTPS (future)",
    "tcpOptions": {"destinationPortRange": {"min": 443, "max": 443}}
  },
  {
    "isStateless": false,
    "protocol": "6",
    "source": "0.0.0.0/0",
    "sourceType": "CIDR_BLOCK",
    "description": "Backend API",
    "tcpOptions": {"destinationPortRange": {"min": 8080, "max": 8080}}
  },
  {
    "isStateless": false,
    "protocol": "1",
    "source": "0.0.0.0/0",
    "sourceType": "CIDR_BLOCK",
    "description": "ICMP Destination Unreachable",
    "icmpOptions": {"code": 4, "type": 3}
  }
]
JSON
)

EGRESS_RULES='[{"isStateless":false,"destination":"0.0.0.0/0","destinationType":"CIDR_BLOCK","protocol":"all","description":"All outbound traffic"}]'

log "Updating security list (SSH, HTTP, HTTPS, API 8080)…"
oci_cli network security-list update \
  --security-list-id "$SL_ID" \
  --ingress-security-rules "$INGRESS_RULES" \
  --egress-security-rules "$EGRESS_RULES" \
  --force \
  --wait-for-state AVAILABLE \
  --query 'data.id' --raw-output > /dev/null
success "Security list configured: $SL_ID"

# ── Subnet ────────────────────────────────────────────────────────────────────
step "Subnet"
SUBNET_ID=$(state_get "subnet_id")
if ! is_ocid "$SUBNET_ID"; then
  SUBNET_ID=$(oci_cli network subnet list \
    --compartment-id "$COMPARTMENT_ID" \
    --vcn-id "$VCN_ID" \
    --display-name "$SUBNET_NAME" \
    --lifecycle-state AVAILABLE \
    --query 'data[0].id' --raw-output 2>/dev/null || echo "")

  if ! is_ocid "$SUBNET_ID"; then
    log "Creating public subnet ($SUBNET_CIDR)…"
    SUBNET_ID=$(oci_cli network subnet create \
      --compartment-id "$COMPARTMENT_ID" \
      --vcn-id "$VCN_ID" \
      --cidr-block "$SUBNET_CIDR" \
      --display-name "$SUBNET_NAME" \
      --dns-label "sridiagpub" \
      --route-table-id "$RT_ID" \
      --security-list-ids "[\"$SL_ID\"]" \
      --prohibit-public-ip-on-vnic false \
      --wait-for-state AVAILABLE \
      --query 'data.id' --raw-output)
    success "Subnet created: $SUBNET_ID"
  else
    success "Subnet already exists: $SUBNET_ID"
  fi
  state_set "subnet_id" "$SUBNET_ID"
else
  success "Subnet loaded from state: $SUBNET_ID"
fi

# ── Find Ubuntu 22.04 ARM image ───────────────────────────────────────────────
step "Ubuntu 22.04 ARM image"
IMAGE_ID=$(state_get "image_id")
if ! is_ocid "$IMAGE_ID"; then
  log "Querying latest Ubuntu 22.04 (aarch64) platform image…"

  # Try ARM-specific image first (named with aarch64)
  IMAGE_ID=$(oci_cli compute image list \
    --compartment-id "$COMPARTMENT_ID" \
    --operating-system "Canonical Ubuntu" \
    --operating-system-version "22.04" \
    --lifecycle-state AVAILABLE \
    --all \
    | jq -r '[.data[] | select(."display-name" | ascii_downcase | contains("aarch64"))]
              | sort_by(."time-created") | last | .id // empty')

  # Fallback: any Ubuntu 22.04 image (for regions that use unified images)
  if ! is_ocid "$IMAGE_ID"; then
    warn "No aarch64-specific image found — falling back to latest Ubuntu 22.04"
    IMAGE_ID=$(oci_cli compute image list \
      --compartment-id "$COMPARTMENT_ID" \
      --operating-system "Canonical Ubuntu" \
      --operating-system-version "22.04" \
      --lifecycle-state AVAILABLE \
      --all \
      | jq -r '.data | sort_by(."time-created") | last | .id')
  fi

  if ! is_ocid "$IMAGE_ID"; then
    error "Could not find a Ubuntu 22.04 image in region $REGION"
    exit 1
  fi
  state_set "image_id" "$IMAGE_ID"
  success "Image found: $IMAGE_ID"
else
  success "Image loaded from state: $IMAGE_ID"
fi

# ── Availability Domain ───────────────────────────────────────────────────────
step "Availability Domain"
AD=$(oci_cli iam availability-domain list \
  --compartment-id "$COMPARTMENT_ID" \
  --query 'data[0].name' --raw-output)
log "Using AD: $AD"

# ── Compute Instance ──────────────────────────────────────────────────────────
step "Compute Instance"
INSTANCE_ID=$(state_get "instance_id")
if ! is_ocid "$INSTANCE_ID"; then
  # Check if already exists by name
  INSTANCE_ID=$(oci_cli compute instance list \
    --compartment-id "$COMPARTMENT_ID" \
    --display-name "$VM_DISPLAY_NAME" \
    --lifecycle-state RUNNING \
    --query 'data[0].id' --raw-output 2>/dev/null || echo "")

  if ! is_ocid "$INSTANCE_ID"; then
    log "Launching $SHAPE ($SHAPE_OCPUS OCPU / ${SHAPE_MEMORY}GB RAM)…"
    log "This takes 2-3 minutes."

    VNIC_DETAILS="{\"subnetId\":\"$SUBNET_ID\",\"assignPublicIp\":true,\"displayName\":\"${VM_DISPLAY_NAME}-vnic\"}"
    METADATA="{\"ssh_authorized_keys\":\"$SSH_PUB_KEY\"}"
    SHAPE_CONFIG="{\"ocpus\":$SHAPE_OCPUS,\"memoryInGBs\":$SHAPE_MEMORY}"
    FREEFORM_TAGS='{"project":"sri-diagnostics","managed-by":"provision-oci.sh"}'

    INSTANCE_ID=$(oci_cli compute instance launch \
      --compartment-id "$COMPARTMENT_ID" \
      --availability-domain "$AD" \
      --shape "$SHAPE" \
      --shape-config "$SHAPE_CONFIG" \
      --image-id "$IMAGE_ID" \
      --create-vnic-details "$VNIC_DETAILS" \
      --display-name "$VM_DISPLAY_NAME" \
      --metadata "$METADATA" \
      --boot-volume-size-in-gbs "$BOOT_VOLUME_GB" \
      --freeform-tags "$FREEFORM_TAGS" \
      --query 'data.id' --raw-output)

    # Save immediately so re-run can find it
    state_set "instance_id" "$INSTANCE_ID"
    log "Instance launched: $INSTANCE_ID"
  else
    success "Instance already exists: $INSTANCE_ID"
    state_set "instance_id" "$INSTANCE_ID"
  fi
else
  success "Instance loaded from state: $INSTANCE_ID"
fi

# ── Wait for RUNNING ──────────────────────────────────────────────────────────
step "Waiting for instance to reach RUNNING state"
log "Checking every 10 seconds (timeout: 10 min)…"
for i in $(seq 1 60); do
  STATE=$(oci_cli compute instance get \
    --instance-id "$INSTANCE_ID" \
    --query 'data."lifecycle-state"' --raw-output 2>/dev/null || echo "UNKNOWN")

  case "$STATE" in
    RUNNING)
      success "Instance is RUNNING (${i}0s elapsed)"
      break
      ;;
    TERMINATED|TERMINATING)
      error "Instance entered $STATE state unexpectedly."
      error "Check OCI Console → Compute → Instances for error details."
      exit 1
      ;;
    *)
      echo -n "  [$STATE] "
      [[ $((i % 6)) -eq 0 ]] && echo ""  # newline every 60s
      sleep 10
      ;;
  esac

  if [[ $i -eq 60 ]]; then
    error "Timeout: Instance did not reach RUNNING after 600s"
    error "Check OCI Console for errors. Re-run with --skip-infra after it's running."
    exit 1
  fi
done
echo ""

# ── Get Public IP ─────────────────────────────────────────────────────────────
step "Public IP"
PUBLIC_IP=$(state_get "public_ip")
if [[ -z "$PUBLIC_IP" || "$PUBLIC_IP" == "null" ]]; then
  log "Fetching public IP…"
  # Retry up to 30s — IP assignment can lag slightly
  for i in $(seq 1 6); do
    PUBLIC_IP=$(oci_cli compute instance list-vnics \
      --instance-id "$INSTANCE_ID" \
      --compartment-id "$COMPARTMENT_ID" \
      --query 'data[0]."public-ip"' --raw-output 2>/dev/null || echo "")
    [[ -n "$PUBLIC_IP" && "$PUBLIC_IP" != "null" ]] && break
    log "Waiting for IP assignment… ($i/6)"
    sleep 5
  done
  if [[ -z "$PUBLIC_IP" || "$PUBLIC_IP" == "null" ]]; then
    error "Could not retrieve public IP. Check OCI Console."
    exit 1
  fi
  state_set "public_ip" "$PUBLIC_IP"
fi
success "Public IP: $PUBLIC_IP"

fi  # end of SKIP_INFRA block

# ── Save full state file ───────────────────────────────────────────────────────
step "Saving state"
cat > "$STATE_FILE" << JSON
{
  "compartment_id":  "${COMPARTMENT_ID}",
  "region":          "${REGION}",
  "vcn_id":          "$(state_get vcn_id)",
  "igw_id":          "$(state_get igw_id)",
  "route_table_id":  "$(state_get route_table_id)",
  "security_list_id":"$(state_get security_list_id)",
  "subnet_id":       "$(state_get subnet_id)",
  "image_id":        "$(state_get image_id)",
  "instance_id":     "$(state_get instance_id)",
  "public_ip":       "$PUBLIC_IP",
  "vm_user":         "$VM_USER",
  "ssh_key":         "$KEY_FILE",
  "provisioned_at":  "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
chmod 600 "$STATE_FILE"
success "State saved to $STATE_FILE"

# ── Write deploy/.deploy.conf ─────────────────────────────────────────────────
step "Writing deploy config"
mkdir -p deploy
cat > "$DEPLOY_CONF" << CONF
# Auto-generated by provision-oci.sh on $(date)
VM_HOST=$PUBLIC_IP
VM_USER=$VM_USER
VM_KEY=$KEY_FILE
DEPLOY_DIR=$DEPLOY_DIR
CONF
chmod 600 "$DEPLOY_CONF"
success "deploy/.deploy.conf updated"

# ── Skip server bootstrap if infra-only ──────────────────────────────────────
if [[ "$INFRA_ONLY" == true ]]; then
  warn "--infra-only: skipping server bootstrap"
  echo ""
  echo -e "${BOLD}${GREEN}Infrastructure ready.${NC}"
  echo "  VM IP: $PUBLIC_IP"
  echo "  Run bootstrap manually:"
  echo "    scp -i $KEY_FILE deploy/setup-server.sh $VM_USER@$PUBLIC_IP:~/"
  echo "    ssh -i $KEY_FILE $VM_USER@$PUBLIC_IP 'bash ~/setup-server.sh'"
  exit 0
fi

# ── Wait for SSH ──────────────────────────────────────────────────────────────
step "Waiting for SSH"
log "VM needs ~30-60s to initialize cloud-init. Checking every 10s (timeout: 5 min)…"
SSH_READY=false
for i in $(seq 1 30); do
  if ssh $SSH_OPTS "$VM_USER@$PUBLIC_IP" exit 0 2>/dev/null; then
    success "SSH ready (${i}0s elapsed)"
    SSH_READY=true
    break
  fi
  echo -n "  [attempt $i/30] "
  sleep 10
done
echo ""
if [[ "$SSH_READY" != true ]]; then
  error "SSH not available after 300s."
  error "Verify security list allows port 22 and the VM finished booting."
  error "Re-run with --skip-infra once SSH is accessible."
  exit 1
fi

# ── Upload and run setup-server.sh ───────────────────────────────────────────
step "Server bootstrap"
log "Uploading setup-server.sh…"
scp $SSH_OPTS deploy/setup-server.sh "$VM_USER@$PUBLIC_IP":~/

log "Running setup-server.sh (takes ~5 minutes)…"
ssh $SSH_OPTS "$VM_USER@$PUBLIC_IP" 'bash ~/setup-server.sh'
success "Server bootstrap complete"

# ── Fetch generated .env back ─────────────────────────────────────────────────
step "Fetching generated .env"
scp $SSH_OPTS "$VM_USER@$PUBLIC_IP:/opt/sri-diagnostics/.env" "$DEPLOY_ENV"
chmod 600 "$DEPLOY_ENV"
success "Saved to $DEPLOY_ENV"
log "Review and fill in any remaining placeholders (SMTP, SMS, payment keys)."

# ── Final summary ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Provisioning Complete ✔${NC}"
echo -e "${BOLD}${GREEN}══════════════════════════════════════════════════${NC}"
echo ""
echo "  VM IP       : $PUBLIC_IP"
echo "  SSH key     : $KEY_FILE"
echo "  State file  : $STATE_FILE"
echo "  Deploy env  : $DEPLOY_ENV"
echo "  Deploy conf : $DEPLOY_CONF"
echo ""
echo "  OCI Resources:"
echo "    Instance   : $(state_get instance_id)"
echo "    VCN        : $(state_get vcn_id)"
echo "    Subnet     : $(state_get subnet_id)"
echo "    Region     : $REGION"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo "    1. Edit $DEPLOY_ENV — fill in SMTP, SMS, payment keys"
echo "    2. Run: ./deploy.sh"
echo ""
echo "  Application URLs (after first deploy):"
echo -e "    Frontend : ${CYAN}http://$PUBLIC_IP${NC}"
echo -e "    Backend  : ${CYAN}http://$PUBLIC_IP:8080${NC}"
echo -e "    API docs : ${CYAN}http://$PUBLIC_IP:8080/docs${NC}"
echo ""
echo "  To SSH into the VM:"
echo "    ssh -i $KEY_FILE $VM_USER@$PUBLIC_IP"
echo ""
echo "  To destroy all OCI resources:"
echo "    ./deploy/destroy-oci.sh"
echo ""
