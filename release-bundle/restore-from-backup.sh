#!/usr/bin/env bash
# =============================================================================
#  restore-from-backup.sh — שחזור מגיבוי
#  שימוש:
#    bash restore-from-backup.sh /path/to/catering-backup-XXXX.tar.gz
# =============================================================================
set -euo pipefail

GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; RED=$'\033[0;31m'; NC=$'\033[0m'
OK="🟢"; WARN="🟡"; FAIL="🔴"

log_ok()   { echo -e "${GREEN}${OK} $*${NC}"; }
log_warn() { echo -e "${YELLOW}${WARN} $*${NC}"; }
log_fail() { echo -e "${RED}${FAIL} $*${NC}"; }

[ $# -lt 1 ] && { log_fail "שימוש: $0 <backup.tar.gz>"; exit 1; }

BACKUP_FILE="$1"
APP_DIR="${APP_DIR:-$(pwd)}"

[ -f "$BACKUP_FILE" ] || { log_fail "קובץ לא קיים: $BACKUP_FILE"; exit 1; }

cat <<EOF
╔══════════════════════════════════════════════════════════════════╗
║   שחזור מגיבוי                                                  ║
╚══════════════════════════════════════════════════════════════════╝
  📦 גיבוי:   $BACKUP_FILE
  📁 אפליקציה: $APP_DIR

  ${YELLOW}⚠️  פעולה הרסנית — DB נוכחי יוחלף.${NC}
EOF

read -rp "הקלד 'restore' לאישור: " confirm
[ "$confirm" = "restore" ] || { log_warn "בוטל"; exit 0; }

# ---------- 1. חילוץ ----------
TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT
tar xzf "$BACKUP_FILE" -C "$TMP"
EXTRACT_DIR=$(find "$TMP" -maxdepth 1 -type d -name 'catering-backup-*' | head -n1)
[ -d "$EXTRACT_DIR" ] || { log_fail "פורמט backup לא תקין"; exit 1; }

log_ok "חולץ: $(basename "$EXTRACT_DIR")"
cat "$EXTRACT_DIR/MANIFEST.txt" 2>/dev/null || true

# ---------- 2. backup של המצב הנוכחי ----------
log_ok "יוצר backup של המצב הנוכחי (לכל מקרה)..."
bash "$(dirname "$0")/backup-now.sh" --tag "pre-restore" || log_warn "backup pre-restore נכשל"

# ---------- 3. PostgreSQL ----------
cd "$APP_DIR"
PG_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'postgres|catering.db|db' | head -n1 || true)
PG_DUMP=$(ls "$EXTRACT_DIR"/postgres-*.sql.gz 2>/dev/null | head -n1 || true)
if [ -n "$PG_CONTAINER" ] && [ -n "$PG_DUMP" ]; then
  PG_USER="${POSTGRES_USER:-catering}"
  PG_DB="${POSTGRES_DB:-catering}"
  log_ok "משחזר PostgreSQL → $PG_DB"
  gunzip -c "$PG_DUMP" | docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB"
  log_ok "PostgreSQL שוחזר"
else
  log_warn "דילוג על PG (container='$PG_CONTAINER', dump='$PG_DUMP')"
fi

# ---------- 4. Redis ----------
REDIS_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'redis' | head -n1 || true)
REDIS_DUMP="$EXTRACT_DIR/redis-dump.rdb.gz"
if [ -n "$REDIS_CONTAINER" ] && [ -f "$REDIS_DUMP" ]; then
  log_ok "משחזר Redis"
  docker exec "$REDIS_CONTAINER" redis-cli FLUSHALL >/dev/null 2>&1 || true
  gunzip -c "$REDIS_DUMP" | docker exec -i "$REDIS_CONTAINER" sh -c 'cat > /data/dump.rdb'
  docker restart "$REDIS_CONTAINER" >/dev/null
  log_ok "Redis שוחזר"
fi

# ---------- 5. uploads/storage ----------
for archive in uploads.tar.gz storage.tar.gz; do
  if [ -f "$EXTRACT_DIR/$archive" ]; then
    tar xzf "$EXTRACT_DIR/$archive" -C "$APP_DIR"
    log_ok "$archive שוחזר"
  fi
done

# ---------- 6. .env (רק אם המשתמש מבקש) ----------
echo ""
read -rp "לשחזר גם קבצי .env מהגיבוי? (y/N): " restore_env
if [[ "$restore_env" =~ ^[Yy]$ ]]; then
  for env_file in .env .env.production .env.local; do
    if [ -f "$EXTRACT_DIR/$env_file" ]; then
      cp "$EXTRACT_DIR/$env_file" "$APP_DIR/$env_file"
      chmod 600 "$APP_DIR/$env_file"
      log_ok "$env_file שוחזר"
    fi
  done
fi

# ---------- 7. restart ----------
log_ok "מפעיל מחדש שירותים..."
for f in docker-compose.prod.yml docker-compose.yml docker-compose.dev.yml; do
  if [ -f "$f" ]; then
    docker compose -f "$f" restart || true
    break
  fi
done

cat <<EOF

${GREEN}══════════════════════════════════════════════════════${NC}
${GREEN}  ✅ השחזור הסתיים${NC}
${GREEN}══════════════════════════════════════════════════════${NC}

  בדוק שהמערכת פועלת:  curl http://localhost:3000/api/health

EOF
