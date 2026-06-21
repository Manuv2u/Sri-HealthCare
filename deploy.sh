#!/usr/bin/env bash
# =============================================================================
# deploy.sh — One-command deployment to OCI VM
#
# Usage:  ./deploy.sh [--skip-build] [--no-rollback]
#
# Reads connection config from deploy/.deploy.conf (gitignored).
# Run  cp deploy/.deploy.conf.example deploy/.deploy.conf  to create it.
# =============================================================================
set -euo pipefail

# Add ~/bin to PATH so OCI CLI installed at ~/bin/oci is always found
export PATH="$HOME/bin:$PATH"

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()     { echo -e "${BLUE}[deploy]${NC} $*"; }
success() { echo -e "${GREEN}[✔]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }
error()   { echo -e "${RED}[✘]${NC} $*" >&2; }
step()    { echo -e "\n${BOLD}${CYAN}▶ $*${NC}"; }

# ── Parse flags ──────────────────────────────────────────────────────────────
SKIP_BUILD=false
NO_ROLLBACK=false
for arg in "$@"; do
  case $arg in
    --skip-build)  SKIP_BUILD=true ;;
    --no-rollback) NO_ROLLBACK=true ;;
    *) error "Unknown argument: $arg"; exit 1 ;;
  esac
done

# ── Load deploy config ───────────────────────────────────────────────────────
CONF="deploy/.deploy.conf"
if [[ ! -f "$CONF" ]]; then
  error "Missing $CONF"
  echo "  Run: cp deploy/.deploy.conf.example deploy/.deploy.conf"
  echo "  Then edit it with your OCI VM details."
  exit 1
fi
# shellcheck source=/dev/null
source "$CONF"

: "${VM_HOST:?VM_HOST not set in $CONF}"
: "${VM_USER:=ubuntu}"
# Key precedence: conf file → provision-oci.sh generated key → legacy ~/.ssh/oci_key
if [[ -z "${VM_KEY:-}" ]]; then
  if [[ -f "./keys/oci_vm_key" ]]; then
    VM_KEY="./keys/oci_vm_key"
  else
    VM_KEY="$HOME/.ssh/oci_key"
  fi
fi
: "${DEPLOY_DIR:=/opt/sri-diagnostics}"

SSH="ssh -i $VM_KEY -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 $VM_USER@$VM_HOST"
SCP="scp -i $VM_KEY -o StrictHostKeyChecking=accept-new"

# ── Derived names ─────────────────────────────────────────────────────────────
BACKEND_IMAGE="sri-healthcare-backend:latest"
FRONTEND_IMAGE="sri-healthcare-frontend:latest"
BACKEND_TAR="/tmp/sri-backend.tar.gz"
FRONTEND_TAR="/tmp/sri-frontend.tar.gz"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ── Env file ──────────────────────────────────────────────────────────────────
ENV_FILE="deploy/.env.production"
if [[ ! -f "$ENV_FILE" ]]; then
  error "Missing $ENV_FILE — copy deploy/.env.production.example and fill in secrets."
  exit 1
fi

# ── Connectivity check ───────────────────────────────────────────────────────
step "Checking VM connectivity"
if ! $SSH exit 0 2>/dev/null; then
  error "Cannot reach $VM_USER@$VM_HOST — check IP, key, and OCI security rules."
  exit 1
fi
success "VM reachable"

# ── Build images ──────────────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == false ]]; then
  # Frontend uses relative /api/v1 URL; nginx inside the container proxies
  # /api/ → http://backend:8000/api/ via Docker-internal networking.
  # No need to patch environment.prod.ts with the VM IP.
  log "API routing: nginx proxy → backend container (no IP patch needed)"

  step "Building backend image"
  docker build -t "$BACKEND_IMAGE" ./backend
  success "Backend image built"

  step "Building frontend image"
  docker build -t "$FRONTEND_IMAGE" ./frontend
  success "Frontend image built"
else
  warn "Skipping image build (--skip-build)"
fi

# ── Export images ─────────────────────────────────────────────────────────────
step "Exporting Docker images"
log "Exporting backend image → $BACKEND_TAR"
docker save "$BACKEND_IMAGE" | gzip > "$BACKEND_TAR"
log "Exporting frontend image → $FRONTEND_TAR"
docker save "$FRONTEND_IMAGE" | gzip > "$FRONTEND_TAR"

BACKEND_SIZE=$(du -sh "$BACKEND_TAR" | cut -f1)
FRONTEND_SIZE=$(du -sh "$FRONTEND_TAR" | cut -f1)
success "Backend: $BACKEND_SIZE  Frontend: $FRONTEND_SIZE"

# ── Upload files ──────────────────────────────────────────────────────────────
step "Uploading to VM ($VM_HOST)"

# Create remote release directory
$SSH "mkdir -p $DEPLOY_DIR/releases/$TIMESTAMP $DEPLOY_DIR/backups $DEPLOY_DIR/logs/archive $DEPLOY_DIR/scripts $DEPLOY_DIR/file_storage"

log "Uploading backend image…"
rsync -az --progress -e "ssh -i $VM_KEY -o StrictHostKeyChecking=accept-new" \
  "$BACKEND_TAR" "$VM_USER@$VM_HOST:$DEPLOY_DIR/releases/$TIMESTAMP/sri-backend.tar.gz"

log "Uploading frontend image…"
rsync -az --progress -e "ssh -i $VM_KEY -o StrictHostKeyChecking=accept-new" \
  "$FRONTEND_TAR" "$VM_USER@$VM_HOST:$DEPLOY_DIR/releases/$TIMESTAMP/sri-frontend.tar.gz"

log "Uploading docker-compose.prod.yml…"
$SCP deploy/docker-compose.prod.yml "$VM_USER@$VM_HOST:$DEPLOY_DIR/docker-compose.yml"

log "Uploading .env.production…"
$SCP deploy/.env.production "$VM_USER@$VM_HOST:$DEPLOY_DIR/.env"

log "Uploading scripts…"
$SCP deploy/scripts/*.sh "$VM_USER@$VM_HOST:$DEPLOY_DIR/scripts/"
$SSH "chmod +x $DEPLOY_DIR/scripts/*.sh"

success "Upload complete"

# ── Remote deployment ─────────────────────────────────────────────────────────
step "Deploying on VM"

$SSH "bash -s $DEPLOY_DIR $TIMESTAMP $NO_ROLLBACK" << 'REMOTE'
#!/usr/bin/env bash
set -euo pipefail
DEPLOY_DIR="$1"
TIMESTAMP="$2"
NO_ROLLBACK="$3"
cd "$DEPLOY_DIR"

echo "[remote] Loading images…"
docker load < "releases/$TIMESTAMP/sri-backend.tar.gz"
docker load < "releases/$TIMESTAMP/sri-frontend.tar.gz"
echo "[remote] Images loaded"

# Tag running images as 'previous' for rollback (best-effort)
docker tag sri-healthcare-backend:latest sri-healthcare-backend:previous 2>/dev/null || true
docker tag sri-healthcare-frontend:latest sri-healthcare-frontend:previous 2>/dev/null || true

echo "[remote] Restarting containers…"
docker compose pull --ignore-pull-failures 2>/dev/null || true
docker compose up -d --force-recreate --remove-orphans
echo "[remote] Containers started"

# Wait for backend health
echo "[remote] Waiting for backend health check…"
RETRIES=24
for i in $(seq 1 $RETRIES); do
  if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
    echo "[remote] Backend healthy (attempt $i)"
    break
  fi
  if [[ $i -eq $RETRIES ]]; then
    echo "[remote] Backend health check failed after $((RETRIES * 5))s"
    if [[ "$NO_ROLLBACK" != "true" ]]; then
      echo "[remote] Rolling back to previous images…"
      docker tag sri-healthcare-backend:previous sri-healthcare-backend:latest 2>/dev/null || true
      docker tag sri-healthcare-frontend:previous sri-healthcare-frontend:latest 2>/dev/null || true
      docker compose up -d --force-recreate
      echo "[remote] Rollback complete"
    fi
    exit 1
  fi
  echo "[remote] Not ready yet (attempt $i/$RETRIES)… retrying in 5s"
  sleep 5
done

# Clean up old release tarballs (keep last 3)
cd "$DEPLOY_DIR/releases"
ls -dt */ 2>/dev/null | tail -n +4 | xargs -r rm -rf
echo "[remote] Old releases pruned"
REMOTE

success "Remote deployment complete"

# ── Local cleanup ─────────────────────────────────────────────────────────────
rm -f "$BACKEND_TAR" "$FRONTEND_TAR"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}════════════════════════════════════════${NC}"
echo -e "${BOLD}  Deployment Successful ✔${NC}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════${NC}"
echo -e "  Frontend : ${CYAN}http://${VM_HOST}${NC}"
echo -e "  API Docs : ${CYAN}http://${VM_HOST}/api/v1/docs${NC}"
echo -e "  Direct BE: ${CYAN}http://${VM_HOST}:8080${NC} (debug only)"
echo -e "  Release  : ${TIMESTAMP}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════${NC}"
echo ""
