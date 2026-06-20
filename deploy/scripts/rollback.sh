#!/usr/bin/env bash
# =============================================================================
# rollback.sh — Revert to the previous Docker images
#
# Run on the VM:  /opt/sri-diagnostics/scripts/rollback.sh
# Run remotely:   ssh -i ~/.ssh/oci_key ubuntu@<IP> /opt/sri-diagnostics/scripts/rollback.sh
# =============================================================================
set -euo pipefail

DEPLOY_DIR="/opt/sri-diagnostics"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'; BOLD='\033[1m'

log()     { echo -e "[$(date '+%H:%M:%S')] $*"; }
success() { echo -e "${GREEN}[✔]${NC} $*"; }
error()   { echo -e "${RED}[✘]${NC} $*" >&2; }

cd "$DEPLOY_DIR"

# ── Check previous images exist ───────────────────────────────────────────────
if ! docker image inspect sri-healthcare-backend:previous &>/dev/null; then
  error "No previous backend image found. Cannot rollback."
  exit 1
fi
if ! docker image inspect sri-healthcare-frontend:previous &>/dev/null; then
  error "No previous frontend image found. Cannot rollback."
  exit 1
fi

log "Previous images found — proceeding with rollback"

# ── Tag current as 'failed' so we can inspect it ─────────────────────────────
docker tag sri-healthcare-backend:latest  sri-healthcare-backend:failed  2>/dev/null || true
docker tag sri-healthcare-frontend:latest sri-healthcare-frontend:failed 2>/dev/null || true

# ── Promote previous → latest ─────────────────────────────────────────────────
log "Promoting previous images to latest…"
docker tag sri-healthcare-backend:previous  sri-healthcare-backend:latest
docker tag sri-healthcare-frontend:previous sri-healthcare-frontend:latest

# ── Restart containers ────────────────────────────────────────────────────────
log "Restarting containers with previous images…"
docker compose up -d --force-recreate

# ── Health check ──────────────────────────────────────────────────────────────
log "Waiting for health check…"
RETRIES=12
for i in $(seq 1 $RETRIES); do
  if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    success "Backend healthy after rollback (attempt $i)"
    break
  fi
  if [[ $i -eq $RETRIES ]]; then
    error "Health check failed after rollback — manual intervention required"
    exit 1
  fi
  log "Not ready yet ($i/$RETRIES)… retrying in 5s"
  sleep 5
done

echo ""
echo -e "${BOLD}${GREEN}Rollback successful ✔${NC}"
echo ""
echo "  Containers are now running the previous image."
echo "  The failed image is tagged as sri-healthcare-*:failed for inspection."
echo ""
echo "  To investigate the failed deployment:"
echo "    docker run --rm sri-healthcare-backend:failed sh"
echo ""
echo "  To discard the failed image after investigation:"
echo "    docker rmi sri-healthcare-backend:failed sri-healthcare-frontend:failed"
echo ""
