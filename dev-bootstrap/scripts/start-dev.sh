#!/usr/bin/env bash
# start-dev.sh
# Bootstrap מלא לסביבת פיתוח בפקודה אחת:
#   Docker up  ->  pnpm install  ->  prisma generate  ->  migrate  ->  seed
#
# שימוש:  ./scripts/start-dev.sh
# דגלים:
#   --skip-install   דילוג על pnpm install
#   --skip-seed      דילוג על זריעת נתונים
#   --scale=<x>      גודל הזריעה: small (ברירת-מחדל) | medium | large
#   --fresh          מחיקת volumes לפני התחלה (איפוס מלא)

set -euo pipefail

# ----- צבעים ללוג -----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${BLUE}${BOLD}[bootstrap]${NC} $*"; }
ok()   { echo -e "${GREEN}${BOLD}[ok]${NC} $*"; }
warn() { echo -e "${YELLOW}${BOLD}[warn]${NC} $*"; }
err()  { echo -e "${RED}${BOLD}[err]${NC} $*" >&2; }

# ----- פיענוח דגלים -----
SKIP_INSTALL=false
SKIP_SEED=false
SCALE="small"
FRESH=false

for arg in "$@"; do
  case "$arg" in
    --skip-install) SKIP_INSTALL=true ;;
    --skip-seed)    SKIP_SEED=true ;;
    --scale=*)      SCALE="${arg#*=}" ;;
    --fresh)        FRESH=true ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) err "דגל לא מוכר: $arg"; exit 1 ;;
  esac
done

# ----- ניווט לתיקיית dev-bootstrap (תיקיית-האב של scripts/) -----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE="docker compose -f docker/docker-compose.dev.yml"

# ----- preflight -----
log "מריץ pre-flight checks..."
if [[ -x "$SCRIPT_DIR/preflight.sh" ]]; then
  "$SCRIPT_DIR/preflight.sh" || { err "preflight נכשל — תקנו את הבעיות ונסו שוב"; exit 1; }
else
  warn "scripts/preflight.sh לא נמצא — דילוג"
fi

# ----- איפוס מלא אם התבקש -----
if $FRESH; then
  warn "דגל --fresh: מוחק את כל ה-volumes של ה-DB!"
  $COMPOSE down -v --remove-orphans || true
fi

# ----- העלאת שירותי Docker -----
log "מעלה Docker services (postgres, redis, mailhog, minio)..."
$COMPOSE up -d

# ----- המתנה ל-Postgres -----
log "ממתין למסד הנתונים..."
RETRIES=60
until docker exec catering_postgres pg_isready -U catering -d catering_dev >/dev/null 2>&1; do
  ((RETRIES--)) || { err "Postgres לא עלה לאחר 60 שניות"; $COMPOSE logs postgres | tail -30; exit 1; }
  sleep 1
done
ok "Postgres זמין על localhost:5432"

# ----- המתנה ל-Redis -----
log "ממתין ל-Redis..."
RETRIES=30
until docker exec catering_redis redis-cli ping >/dev/null 2>&1; do
  ((RETRIES--)) || { err "Redis לא עלה לאחר 30 שניות"; exit 1; }
  sleep 1
done
ok "Redis זמין על localhost:6379"

# ----- ניווט לשורש המונורפו (אחת מעל dev-bootstrap) -----
REPO_ROOT="$(cd "$ROOT_DIR/.." && pwd)"
if [[ -f "$REPO_ROOT/pnpm-workspace.yaml" || -f "$REPO_ROOT/pnpm-lock.yaml" || -f "$REPO_ROOT/package.json" ]]; then
  cd "$REPO_ROOT"
  log "שורש הרפו זוהה: $REPO_ROOT"
else
  warn "לא נמצא שורש מונורפו ב-$REPO_ROOT — מריץ pnpm בתיקייה הנוכחית"
fi

# ----- .env -----
if [[ ! -f .env && -f "$ROOT_DIR/.env.dev.example" ]]; then
  log "מעתיק .env.dev.example -> .env"
  cp "$ROOT_DIR/.env.dev.example" .env
  ok ".env נוצר"
fi

# ----- pnpm install -----
if ! $SKIP_INSTALL; then
  log "מתקין תלויות (pnpm install)..."
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
  ok "תלויות הותקנו"
else
  warn "דילוג על pnpm install (--skip-install)"
fi

# ----- Prisma generate -----
if pnpm run | grep -qE '^\s+db:generate'; then
  log "יוצר Prisma client..."
  pnpm db:generate
  ok "Prisma client נוצר"
else
  warn "אין סקריפט db:generate — דילוג"
fi

# ----- Prisma migrate -----
if pnpm run | grep -qE '^\s+db:migrate'; then
  log "מריץ migrations..."
  pnpm db:migrate
  ok "migrations הושלמו"
else
  warn "אין סקריפט db:migrate — דילוג"
fi

# ----- Seed -----
if ! $SKIP_SEED; then
  if pnpm run | grep -qE '^\s+db:seed'; then
    log "זורע נתוני דמו (scale=$SCALE)..."
    pnpm db:seed -- --tenant=demo --scale="$SCALE" || warn "seed נכשל — ניתן להריץ ידנית מאוחר יותר"
    ok "נתוני דמו נטענו"
  else
    warn "אין סקריפט db:seed — דילוג"
  fi
else
  warn "דילוג על seed (--skip-seed)"
fi

# ----- סיכום -----
echo
ok "==================== הסביבה מוכנה! ===================="
echo "  Postgres:  postgresql://catering:dev_password_change_in_prod@localhost:5432/catering_dev"
echo "  Redis:     redis://localhost:6379"
echo "  MailHog:   http://localhost:8025  (SMTP על 1025)"
echo "  MinIO:     http://localhost:9001  (catering / dev_password_change_in_prod)"
echo
echo "  הצעד הבא:  pnpm dev"
echo "========================================================"
