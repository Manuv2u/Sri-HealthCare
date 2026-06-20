#!/usr/bin/env bash
# =============================================================================
# backup-db.sh — Daily PostgreSQL backup
# Cron: 0 2 * * * ubuntu /opt/sri-diagnostics/scripts/backup-db.sh
# =============================================================================
set -euo pipefail

DEPLOY_DIR="/opt/sri-diagnostics"
BACKUP_DIR="$DEPLOY_DIR/backups"
LOG_DIR="$DEPLOY_DIR/logs"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
FILE="$BACKUP_DIR/sri_diagnostics_${DATE}.sql.gz"
RETAIN_DAYS=7

# Load env for DB credentials
if [[ -f "$DEPLOY_DIR/.env" ]]; then
  # shellcheck source=/dev/null
  set -o allexport
  source <(grep -v '^#' "$DEPLOY_DIR/.env" | grep -v '^$')
  set +o allexport
fi

: "${DB_NAME:=sri_diagnostics}"
: "${DB_USER:=sri_user}"
: "${DB_PASSWORD:?DB_PASSWORD not set}"

log() { echo "[$(date '+%H:%M:%S')] [backup] $*"; }

log "Starting backup → $FILE"

mkdir -p "$BACKUP_DIR"

PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h localhost \
  -p "${DB_PORT:-5432}" \
  -U "$DB_USER" \
  --no-password \
  --format=plain \
  --clean \
  --if-exists \
  "$DB_NAME" \
  | gzip > "$FILE"

SIZE=$(du -sh "$FILE" | cut -f1)
log "Backup complete: $FILE ($SIZE)"

# ── Cleanup old backups ───────────────────────────────────────────────────────
log "Removing backups older than ${RETAIN_DAYS} days…"
DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$RETAIN_DAYS" -print -delete | wc -l)
log "Removed $DELETED old backup(s)"

# ── Verify backup is readable ─────────────────────────────────────────────────
if gzip -t "$FILE" 2>/dev/null; then
  log "Backup integrity check passed"
else
  log "ERROR: Backup file appears corrupted!"
  exit 1
fi

log "Done"
