#!/usr/bin/env bash
# =============================================================================
#  backup-now.sh — גיבוי ידני של DB + uploads + .env
#  שימוש:
#    bash backup-now.sh [--tag NAME] [--dest /path/to/backups]
# =============================================================================
set -euo pipefail

GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; RED=$'\033[0;31m'; NC=$'\033[0m'
OK="🟢"; WARN="🟡"; FAIL="🔴"

log_ok()   { echo -e "${GREEN}${OK} $*${NC}"; }
log_warn() { echo -e "${YELLOW}${WARN} $*${NC}"; }
log_fail() { echo -e "${RED}${FAIL} $*${NC}"; }

TAG=""
DEST="${BACKUP_DIR:-$HOME/backups}"
APP_DIR="${APP_DIR:-$(pwd)}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)  TAG="$2"; shift 2 ;;
    --dest) DEST="$2"; shift 2 ;;
    --dir)  APP_DIR="$2"; shift 2 ;;
    *) log_fail "פרמטר לא מוכר: $1"; exit 1 ;;
  esac
done

mkdir -p "$DEST"
TS=$(date +%Y%m%d-%H%M%S)
NAME="catering-backup-${TS}${TAG:+-$TAG}"
BACKUP_PATH="${DEST}/${NAME}"
mkdir -p "$BACKUP_PATH"

cat <<EOF
╔══════════════════════════════════════════════════════════════════╗
║   גיבוי ידני                                                    ║
╚══════════════════════════════════════════════════════════════════╝
  📁 יעד: $BACKUP_PATH
EOF

cd "$APP_DIR"

# ---------- 1. PostgreSQL ----------
log_ok "מגבה PostgreSQL..."
PG_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'postgres|catering.db|db' | head -n1 || true)
if [ -n "$PG_CONTAINER" ]; then
  PG_USER="${POSTGRES_USER:-catering}"
  PG_DB="${POSTGRES_DB:-catering}"
  docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DB" --no-owner --clean --if-exists \
    | gzip > "$BACKUP_PATH/postgres-${PG_DB}.sql.gz"
  log_ok "PostgreSQL נשמר ($(du -h "$BACKUP_PATH/postgres-${PG_DB}.sql.gz" | cut -f1))"
else
  log_warn "container של postgres לא נמצא"
fi

# ---------- 2. Redis ----------
REDIS_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'redis' | head -n1 || true)
if [ -n "$REDIS_CONTAINER" ]; then
  docker exec "$REDIS_CONTAINER" redis-cli SAVE >/dev/null 2>&1 || true
  docker cp "$REDIS_CONTAINER:/data/dump.rdb" "$BACKUP_PATH/redis-dump.rdb" 2>/dev/null || true
  if [ -f "$BACKUP_PATH/redis-dump.rdb" ]; then
    gzip "$BACKUP_PATH/redis-dump.rdb"
    log_ok "Redis נשמר"
  fi
fi

# ---------- 3. uploads ----------
if [ -d "$APP_DIR/uploads" ]; then
  tar czf "$BACKUP_PATH/uploads.tar.gz" -C "$APP_DIR" uploads
  log_ok "uploads/ נשמר ($(du -h "$BACKUP_PATH/uploads.tar.gz" | cut -f1))"
fi
if [ -d "$APP_DIR/storage" ]; then
  tar czf "$BACKUP_PATH/storage.tar.gz" -C "$APP_DIR" storage
  log_ok "storage/ נשמר"
fi

# ---------- 4. .env files (מוצפן) ----------
for env_file in .env .env.production .env.local; do
  if [ -f "$APP_DIR/$env_file" ]; then
    cp "$APP_DIR/$env_file" "$BACKUP_PATH/${env_file}"
  fi
done

# ---------- 5. metadata ----------
cat > "$BACKUP_PATH/MANIFEST.txt" <<EOF
backup_name: ${NAME}
created_at: $(date -Iseconds)
app_dir: ${APP_DIR}
git_sha: $(git -C "$APP_DIR" rev-parse HEAD 2>/dev/null || echo "n/a")
git_branch: $(git -C "$APP_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "n/a")
hostname: $(hostname)
contents:
$(ls -lah "$BACKUP_PATH" | tail -n +2)
EOF

# ---------- 6. tar את הכל ----------
cd "$DEST"
tar czf "${NAME}.tar.gz" "$NAME"
rm -rf "$BACKUP_PATH"
chmod 600 "${NAME}.tar.gz"
log_ok "גיבוי נוצר: ${DEST}/${NAME}.tar.gz ($(du -h "${NAME}.tar.gz" | cut -f1))"

# ---------- 7. retention ----------
find "$DEST" -name 'catering-backup-*.tar.gz' -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
log_ok "ניקוי backups ישנים מעל ${RETENTION_DAYS} ימים"

# ---------- 8. סיכום ----------
echo ""
log_ok "סך הכל ב-$DEST:"
ls -lah "$DEST" | grep 'catering-backup-' | tail -n 10
