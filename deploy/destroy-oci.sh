#!/usr/bin/env bash
# =============================================================================
# destroy-oci.sh — Tear down all OCI resources created by provision-oci.sh
#
# Usage:  ./deploy/destroy-oci.sh
#
# Reads resource OCIDs from .oci-state.json.
# Prompts for confirmation before deleting anything.
# Order of deletion is the reverse of creation.
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
log()     { echo -e "${BLUE}[destroy]${NC} $*"; }
success() { echo -e "${GREEN}[✔]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✘]${NC} $*" >&2; }

STATE_FILE=".oci-state.json"
OCI_PROFILE="${OCI_CLI_PROFILE:-DEFAULT}"
oci_cli() { oci --profile "$OCI_PROFILE" "$@"; }
is_ocid() { [[ -n "${1:-}" && "${1:-}" != "null" && "${1:-}" == ocid1.* ]]; }
state_get() { [[ -f "$STATE_FILE" ]] && jq -r ".${1} // empty" "$STATE_FILE" || echo ""; }

# ── Validate ──────────────────────────────────────────────────────────────────
if [[ ! -f "$STATE_FILE" ]]; then
  error "No $STATE_FILE found. Nothing to destroy."
  exit 1
fi

if ! command -v oci &>/dev/null; then
  error "OCI CLI not found."
  exit 1
fi

if ! command -v jq &>/dev/null; then
  error "jq not found."
  exit 1
fi

# ── Show what will be deleted ─────────────────────────────────────────────────
PUBLIC_IP=$(state_get "public_ip")
INSTANCE_ID=$(state_get "instance_id")
SUBNET_ID=$(state_get "subnet_id")
IGW_ID=$(state_get "igw_id")
RT_ID=$(state_get "route_table_id")
SL_ID=$(state_get "security_list_id")
VCN_ID=$(state_get "vcn_id")

echo ""
echo -e "${BOLD}${RED}══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  ⚠  This will PERMANENTLY DELETE:${NC}"
echo -e "${BOLD}${RED}══════════════════════════════════════════════════${NC}"
echo ""
echo "  Compute Instance : $INSTANCE_ID"
echo "  Public IP        : $PUBLIC_IP"
echo "  Subnet           : $SUBNET_ID"
echo "  Internet Gateway : $IGW_ID"
echo "  Route Table      : $RT_ID"
echo "  Security List    : $SL_ID"
echo "  VCN              : $VCN_ID"
echo ""
echo -e "${YELLOW}  This is IRREVERSIBLE. All data on the VM will be lost.${NC}"
echo -e "${YELLOW}  Database backups in /opt/sri-diagnostics/backups/ will be gone.${NC}"
echo ""
read -r -p "  Type 'yes' to confirm destruction: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  log "Aborted."
  exit 0
fi
echo ""

# ── Terminate Instance ────────────────────────────────────────────────────────
if is_ocid "$INSTANCE_ID"; then
  log "Terminating compute instance…"
  oci_cli compute instance terminate \
    --instance-id "$INSTANCE_ID" \
    --preserve-boot-volume false \
    --force || warn "Instance termination failed (may already be terminated)"

  log "Waiting for instance TERMINATED state…"
  for i in $(seq 1 60); do
    STATE=$(oci_cli compute instance get \
      --instance-id "$INSTANCE_ID" \
      --query 'data."lifecycle-state"' --raw-output 2>/dev/null || echo "TERMINATED")
    [[ "$STATE" == "TERMINATED" ]] && break
    echo -n "  [$STATE] "
    sleep 10
  done
  echo ""
  success "Instance terminated"
else
  warn "No instance OCID in state — skipping"
fi

# ── Delete Subnet ─────────────────────────────────────────────────────────────
if is_ocid "$SUBNET_ID"; then
  log "Deleting subnet…"
  # Retry — subnet deletion sometimes needs a brief pause after instance term
  for i in $(seq 1 6); do
    if oci_cli network subnet delete \
        --subnet-id "$SUBNET_ID" \
        --force \
        --wait-for-state TERMINATED 2>/dev/null; then
      success "Subnet deleted"
      break
    fi
    warn "Subnet delete failed (attempt $i/6) — waiting 10s for dependencies to clear…"
    sleep 10
  done
else
  warn "No subnet OCID in state — skipping"
fi

# ── Detach + Delete Internet Gateway ─────────────────────────────────────────
if is_ocid "$IGW_ID"; then
  log "Removing IGW route from route table…"
  oci_cli network route-table update \
    --rt-id "$RT_ID" \
    --route-rules "[]" \
    --force \
    --wait-for-state AVAILABLE \
    --query 'data.id' --raw-output > /dev/null 2>/dev/null || true

  log "Deleting Internet Gateway…"
  oci_cli network internet-gateway delete \
    --ig-id "$IGW_ID" \
    --force \
    --wait-for-state TERMINATED 2>/dev/null || warn "IGW delete failed (may already be gone)"
  success "Internet Gateway deleted"
else
  warn "No IGW OCID in state — skipping"
fi

# ── Delete VCN (also removes default route table and security list) ───────────
if is_ocid "$VCN_ID"; then
  log "Deleting VCN (with default route table and security list)…"
  oci_cli network vcn delete \
    --vcn-id "$VCN_ID" \
    --force \
    --wait-for-state TERMINATED 2>/dev/null || warn "VCN delete failed (check for remaining resources)"
  success "VCN deleted"
else
  warn "No VCN OCID in state — skipping"
fi

# ── Clean up local files ──────────────────────────────────────────────────────
echo ""
read -r -p "  Also delete local keys/ and state files? [y/N]: " DEL_LOCAL
if [[ "$DEL_LOCAL" =~ ^[Yy]$ ]]; then
  rm -rf keys/
  rm -f "$STATE_FILE" deploy/.deploy.conf deploy/.env.production
  success "Local keys and state files deleted"
else
  log "Local files kept (keys/, $STATE_FILE)"
fi

echo ""
echo -e "${BOLD}${GREEN}All OCI resources destroyed.${NC}"
echo ""
