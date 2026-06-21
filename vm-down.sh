#!/usr/bin/env bash
# =============================================================================
# vm-down.sh — Delete OCI VM and all cloud resources
#
# Usage:
#   ./vm-down.sh
#
# WARNING: This permanently deletes the VM, all its data, and all OCI
# networking resources (VCN, subnet, internet gateway, security list).
# Back up your database first:
#   ssh -i keys/oci_vm_key ubuntu@<IP> \
#     '/opt/sri-diagnostics/scripts/backup-db.sh'
# =============================================================================
set -euo pipefail
export PATH="$HOME/bin:$PATH"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
log()     { echo -e "${BLUE}[vm-down]${NC} $*"; }
error()   { echo -e "${RED}[✘]${NC} $*" >&2; }

# ── Pre-flight ────────────────────────────────────────────────────────────────
if ! command -v oci &>/dev/null; then
  error "OCI CLI not found at ~/bin/oci or in PATH."
  echo "  Install: bash -c \"\$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)\""
  exit 1
fi

if ! command -v jq &>/dev/null; then
  error "jq not found. Install: brew install jq"
  exit 1
fi

if [[ ! -f ".oci-state.json" ]]; then
  error "No .oci-state.json found — nothing to destroy."
  echo "  This file is created by ./vm-up.sh (or provision-oci.sh)."
  exit 1
fi

# ── Show current VM info ──────────────────────────────────────────────────────
VM_HOST=$(jq -r '.public_ip // empty' .oci-state.json 2>/dev/null || echo "")
INSTANCE_ID=$(jq -r '.instance_id // empty' .oci-state.json 2>/dev/null || echo "")

echo ""
echo -e "${BOLD}${RED}  ⚠  WARNING: DESTRUCTIVE OPERATION${NC}"
echo ""
if [[ -n "$VM_HOST" ]]; then
  echo "  VM IP     : $VM_HOST"
fi
if [[ -n "$INSTANCE_ID" ]]; then
  echo "  Instance  : $INSTANCE_ID"
fi
echo ""
echo -e "${YELLOW}  This will permanently delete the VM and ALL cloud resources.${NC}"
echo -e "${YELLOW}  All application data and the PostgreSQL database will be LOST.${NC}"
echo ""
echo "  Before proceeding, back up your database:"
if [[ -n "$VM_HOST" ]]; then
  echo "    ssh -i keys/oci_vm_key ubuntu@${VM_HOST} \\"
  echo "      '/opt/sri-diagnostics/scripts/backup-db.sh'"
fi
echo ""

# ── Delegate to destroy script ────────────────────────────────────────────────
log "Running destroy script…"
bash ./deploy/destroy-oci.sh

echo -e "${BOLD}${GREEN}VM and all OCI resources have been removed.${NC}"
echo ""
echo "  To create a new VM:  ./vm-up.sh"
echo ""
