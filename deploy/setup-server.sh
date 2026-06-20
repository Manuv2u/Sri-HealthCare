#!/usr/bin/env bash
# =============================================================================
# setup-server.sh — One-time OCI VM bootstrap
#
# Run this ONCE on the server after provisioning the VM:
#   scp -i ~/.ssh/oci_key deploy/setup-server.sh ubuntu@<IP>:~/
#   ssh -i ~/.ssh/oci_key ubuntu@<IP> 'bash ~/setup-server.sh'
#
# The script is idempotent — safe to re-run.
# =============================================================================
set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
log()     { echo -e "${BLUE}[setup]${NC} $*"; }
success() { echo -e "${GREEN}[✔]${NC} $*"; }
warn()    { echo -e "${YELLOW}[!]${NC} $*"; }

# Must run as root or via sudo
if [[ $EUID -ne 0 ]]; then
  exec sudo bash "$0" "$@"
fi

# ── Config ────────────────────────────────────────────────────────────────────
DEPLOY_DIR="/opt/sri-diagnostics"
DB_NAME="sri_diagnostics"
DB_USER="sri_user"
PG_VERSION="15"

# Generate a strong random password if .env doesn't exist yet
if [[ -f "$DEPLOY_DIR/.env" ]]; then
  DB_PASS=$(grep "^DB_PASSWORD=" "$DEPLOY_DIR/.env" | cut -d= -f2 || true)
fi
DB_PASS="${DB_PASS:-$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 32)}"

# ── 1. System packages ────────────────────────────────────────────────────────
log "Updating system packages…"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget gnupg2 lsb-release ca-certificates \
  apt-transport-https software-properties-common \
  unzip zip rsync jq htop ufw fail2ban

success "System packages ready"

# ── 2. Docker ─────────────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  log "Installing Docker…"
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker ubuntu
  systemctl enable docker
  systemctl start docker
  success "Docker installed"
else
  success "Docker already installed ($(docker --version))"
fi

# Docker Compose v2 (plugin)
if ! docker compose version &>/dev/null; then
  log "Installing Docker Compose plugin…"
  COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  success "Docker Compose installed (${COMPOSE_VERSION})"
else
  success "Docker Compose already installed ($(docker compose version --short))"
fi

# ── 3. PostgreSQL 15 ──────────────────────────────────────────────────────────
if ! dpkg -l postgresql-${PG_VERSION} &>/dev/null; then
  log "Adding PostgreSQL APT repository…"
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -qq

  log "Installing PostgreSQL ${PG_VERSION}…"
  apt-get install -y -qq postgresql-${PG_VERSION} postgresql-contrib-${PG_VERSION}
  systemctl enable postgresql
  systemctl start postgresql
  success "PostgreSQL ${PG_VERSION} installed"
else
  success "PostgreSQL ${PG_VERSION} already installed"
fi

# ── 4. Configure PostgreSQL ───────────────────────────────────────────────────
log "Configuring PostgreSQL…"

PG_HBA="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"
PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"

# Listen only on localhost (no external connections)
sed -i "s/^#listen_addresses.*/listen_addresses = 'localhost'/" "$PG_CONF"

# Force password auth for the app user (local socket and localhost TCP)
# Keep peer auth for system postgres user
if ! grep -q "sri_user" "$PG_HBA"; then
  cat >> "$PG_HBA" << SQL

# Sri Diagnostics app user
host    ${DB_NAME}    ${DB_USER}    127.0.0.1/32    scram-sha-256
host    ${DB_NAME}    ${DB_USER}    ::1/128          scram-sha-256
SQL
fi

systemctl reload postgresql
success "PostgreSQL configured"

# ── 5. Create database and user ───────────────────────────────────────────────
log "Setting up database…"

sudo -u postgres psql -v ON_ERROR_STOP=1 << SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
    RAISE NOTICE 'User ${DB_USER} created';
  ELSE
    ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
    RAISE NOTICE 'User ${DB_USER} password updated';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')
\gexec

GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

success "Database '${DB_NAME}' and user '${DB_USER}' ready"

# ── 6. Directory structure ────────────────────────────────────────────────────
log "Creating application directories…"
mkdir -p \
  "$DEPLOY_DIR/releases" \
  "$DEPLOY_DIR/backups" \
  "$DEPLOY_DIR/logs/archive" \
  "$DEPLOY_DIR/scripts" \
  "$DEPLOY_DIR/file_storage"
chown -R ubuntu:ubuntu "$DEPLOY_DIR"
success "Directories created at $DEPLOY_DIR"

# ── 7. Write .env if not present ─────────────────────────────────────────────
if [[ ! -f "$DEPLOY_DIR/.env" ]]; then
  log "Writing initial .env (review and update secrets)…"
  cat > "$DEPLOY_DIR/.env" << ENV
# ── Database ──────────────────────────────────────────────────────────────────
# Used by backend container — host.docker.internal reaches host Postgres
DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASS}@host.docker.internal:5432/${DB_NAME}
DB_HOST=host.docker.internal
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}

# ── Auth — CHANGE THIS ────────────────────────────────────────────────────────
JWT_SECRET=$(openssl rand -base64 48)

# ── File Storage ──────────────────────────────────────────────────────────────
FILE_STORAGE_BACKEND=local
FILE_STORAGE_PATH=/app/file_storage

# ── Payments — fill in your gateway keys ─────────────────────────────────────
PAYMENT_WEBHOOK_SECRET=$(openssl rand -base64 32)

# ── Email ─────────────────────────────────────────────────────────────────────
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=change-me

# ── SMS ───────────────────────────────────────────────────────────────────────
SMS_PROVIDER=msg91
SMS_API_KEY=change-me

# ── App ───────────────────────────────────────────────────────────────────────
LOG_LEVEL=INFO
GST_RATE=0.18
ENV_PROFILE=production
ENV
  chown ubuntu:ubuntu "$DEPLOY_DIR/.env"
  chmod 600 "$DEPLOY_DIR/.env"
  success ".env written — review $DEPLOY_DIR/.env and update any placeholder values"
else
  success ".env already exists — skipped"
fi

# ── 8. Firewall (UFW) ─────────────────────────────────────────────────────────
log "Configuring UFW firewall…"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'HTTP (frontend)'
ufw allow 443/tcp  comment 'HTTPS (future)'
ufw allow 8080/tcp comment 'Backend API'
ufw --force enable
success "UFW configured"

# ── 9. fail2ban ───────────────────────────────────────────────────────────────
log "Configuring fail2ban…"
cat > /etc/fail2ban/jail.local << 'FAIL2BAN'
[sshd]
enabled  = true
port     = ssh
maxretry = 5
bantime  = 3600
findtime = 600
FAIL2BAN
systemctl enable fail2ban
systemctl restart fail2ban
success "fail2ban configured"

# ── 10. Server-side maintenance scripts ──────────────────────────────────────
# These will be overwritten by deploy.sh on each deploy — scaffold them here
# so cron can reference them before first deploy.
cat > "$DEPLOY_DIR/scripts/backup-db.sh" << 'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
source /opt/sri-diagnostics/.env 2>/dev/null || true
BACKUP_DIR="/opt/sri-diagnostics/backups"
DATE=$(date +%Y-%m-%d)
FILE="$BACKUP_DIR/sri_diagnostics_${DATE}.sql.gz"
PGPASSWORD="$DB_PASSWORD" pg_dump -h localhost -U "$DB_USER" "$DB_NAME" | gzip > "$FILE"
echo "[backup] Wrote $FILE ($(du -sh "$FILE" | cut -f1))"
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
echo "[backup] Old backups cleaned"
SCRIPT

cat > "$DEPLOY_DIR/scripts/archive-logs.sh" << 'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
LOG_DIR="/opt/sri-diagnostics/logs"
ARCHIVE_DIR="$LOG_DIR/archive"
DATE=$(date +%Y-%m-%d)
FILE="$ARCHIVE_DIR/logs_${DATE}.zip"
cd "$LOG_DIR"
zip -q "$FILE" *.log 2>/dev/null || true
echo "[archive] Wrote $FILE"
find "$ARCHIVE_DIR" -name "*.zip" -mtime +7 -delete
echo "[archive] Old archives cleaned"
SCRIPT

cat > "$DEPLOY_DIR/scripts/cleanup.sh" << 'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
# Remove unused Docker images and containers
docker image prune -f --filter "until=168h"
docker container prune -f --filter "until=24h"
# Keep only last 3 releases
cd /opt/sri-diagnostics/releases
ls -dt */ 2>/dev/null | tail -n +4 | xargs -r rm -rf
echo "[cleanup] Done"
SCRIPT

chmod +x "$DEPLOY_DIR"/scripts/*.sh
chown -R ubuntu:ubuntu "$DEPLOY_DIR/scripts"
success "Scripts installed"

# ── 11. Cron jobs ─────────────────────────────────────────────────────────────
log "Installing cron jobs…"
CRON_FILE="/etc/cron.d/sri-diagnostics"
cat > "$CRON_FILE" << CRON
# Sri Diagnostics automated maintenance
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Daily DB backup at 02:00
0 2 * * * ubuntu /opt/sri-diagnostics/scripts/backup-db.sh >> /opt/sri-diagnostics/logs/backup.log 2>&1

# Daily log archival at 03:00
0 3 * * * ubuntu /opt/sri-diagnostics/scripts/archive-logs.sh >> /opt/sri-diagnostics/logs/archive.log 2>&1

# Daily cleanup at 04:00
0 4 * * * ubuntu /opt/sri-diagnostics/scripts/cleanup.sh >> /opt/sri-diagnostics/logs/cleanup.log 2>&1
CRON
chmod 644 "$CRON_FILE"
success "Cron jobs installed"

# ── 12. Docker daemon config ──────────────────────────────────────────────────
log "Configuring Docker log rotation…"
cat > /etc/docker/daemon.json << 'DOCKER'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  }
}
DOCKER
systemctl restart docker
success "Docker daemon configured"

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}════════════════════════════════════════${NC}"
echo -e "${BOLD}  Server setup complete ✔${NC}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "  DB name    : $DB_NAME"
echo "  DB user    : $DB_USER"
echo "  DB password: $DB_PASS"
echo ""
echo -e "  ${YELLOW}▶ Save the DB password above — it is also in $DEPLOY_DIR/.env${NC}"
echo ""
echo "  Next steps:"
echo "    1. Review and complete $DEPLOY_DIR/.env (JWT_SECRET, SMTP, etc.)"
echo "    2. Copy .env to your local machine: deploy/.env.production"
echo "    3. Run ./deploy.sh from your local machine"
echo ""
echo "  OCI Console reminder:"
echo "    Add ingress rules for ports 22, 80, 443, 8080 in your VCN Security List"
echo ""
