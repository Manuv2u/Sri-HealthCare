#!/usr/bin/env bash
# =============================================================================
# vm-up.sh — Create OCI VM and deploy Sri Diagnostics app
#
# Usage:
#   ./vm-up.sh              # Full: provision VM + deploy app
#   ./vm-up.sh --provision  # Only create/verify VM (skip deploy)
#   ./vm-up.sh --deploy     # Only deploy app (VM must already exist)
#
# Prerequisites (one-time setup — see README.md):
#   1. OCI CLI installed     ~/bin/oci
#   2. OCI API key uploaded  OCI Console → Profile → API Keys
#   3. Docker running        docker info
# =============================================================================
set -euo pipefail
export PATH="$HOME/bin:$PATH"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
log()     { echo -e "${BLUE}[vm-up]${NC} $*"; }
success() { echo -e "${GREEN}[✔]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✘]${NC} $*" >&2; }
step()    { echo -e "\n${BOLD}${CYAN}══ $* ══${NC}"; }

# ── Flags ─────────────────────────────────────────────────────────────────────
DO_PROVISION=true
DO_DEPLOY=true

for arg in "$@"; do
  case $arg in
    --provision) DO_DEPLOY=false ;;
    --deploy)    DO_PROVISION=false ;;
    --help|-h)
      echo "Usage: $0 [--provision | --deploy]"
      echo "  (no flags)    Full run: create VM + deploy app"
      echo "  --provision   Create/verify VM only"
      echo "  --deploy      Deploy app only (VM must exist)"
      exit 0 ;;
    *) error "Unknown argument: $arg. Use --help for usage."; exit 1 ;;
  esac
done

# ── Pre-flight ────────────────────────────────────────────────────────────────
step "Pre-flight checks"

if ! command -v oci &>/dev/null; then
  error "OCI CLI not found."
  echo ""
  echo "  Install it:"
  echo "    bash -c \"\$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)\""
  echo "  Then configure:"
  echo "    oci setup config"
  exit 1
fi
success "OCI CLI: $(oci --version 2>/dev/null | head -1)"

if ! command -v docker &>/dev/null; then
  error "Docker not found. Install Docker Desktop."
  exit 1
fi
if ! docker info &>/dev/null 2>&1; then
  error "Docker daemon is not running. Start Docker Desktop."
  exit 1
fi
success "Docker: $(docker --version)"

if ! command -v jq &>/dev/null; then
  error "jq not found. Install: brew install jq"
  exit 1
fi
success "jq: $(jq --version)"

if ! oci iam region list &>/dev/null 2>&1; then
  error "OCI credentials not working."
  echo ""
  echo "  Fix: Upload your public key to OCI Console:"
  echo "    OCI Console → Profile (top right) → User Settings → API Keys → Add API Key"
  echo "    Paste contents of: ~/.oci/oci_api_key_public.pem"
  echo ""
  echo "  Or re-run: oci setup config"
  exit 1
fi
success "OCI credentials verified"

# ── Step 1: Provision VM ──────────────────────────────────────────────────────
if [[ "$DO_PROVISION" == true ]]; then
  step "Step 1: Provisioning OCI VM"
  log "This creates the VM, installs Docker & PostgreSQL, and bootstraps the server."
  log "Estimated time: 10-15 minutes on first run."
  echo ""
  bash ./provision-oci.sh
fi

# ── Step 2: Deploy app ────────────────────────────────────────────────────────
if [[ "$DO_DEPLOY" == true ]]; then
  step "Step 2: Building and deploying application"

  if [[ ! -f "deploy/.deploy.conf" ]]; then
    error "deploy/.deploy.conf not found."
    echo "  This is auto-created by provision-oci.sh."
    echo "  Run: ./vm-up.sh --provision  first."
    exit 1
  fi
  if [[ ! -f "deploy/.env.production" ]]; then
    error "deploy/.env.production not found."
    echo "  This is auto-created by provision-oci.sh after server setup."
    echo "  Run: ./vm-up.sh --provision  first."
    exit 1
  fi

  log "Building Docker images and deploying to VM."
  log "Estimated time: 5-10 minutes."
  echo ""
  bash ./deploy.sh
fi

# ── Done ──────────────────────────────────────────────────────────────────────
VM_HOST=$(grep "^VM_HOST=" deploy/.deploy.conf 2>/dev/null | cut -d= -f2 || echo "")
echo ""
echo -e "${BOLD}${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Sri Diagnostics is LIVE ✔${NC}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════════════${NC}"
echo ""
if [[ -n "$VM_HOST" ]]; then
  echo -e "  App      : ${CYAN}http://${VM_HOST}${NC}"
  echo -e "  API Docs : ${CYAN}http://${VM_HOST}/api/v1/docs${NC}"
  echo -e "  SSH      : ssh -i keys/oci_vm_key ubuntu@${VM_HOST}"
fi
echo ""
echo "  To tear down:  ./vm-down.sh"
echo "  To re-deploy:  ./vm-up.sh --deploy"
echo ""
