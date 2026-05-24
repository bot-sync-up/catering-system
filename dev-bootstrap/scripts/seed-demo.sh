#!/usr/bin/env bash
# seed-demo.sh
# מריץ את חבילת @aneh/seed-data כנגד ה-DB הרץ.
# שימוש:
#   ./scripts/seed-demo.sh                  # tenant=demo, scale=small
#   ./scripts/seed-demo.sh --scale=medium   # נפח בינוני
#   ./scripts/seed-demo.sh --tenant=foo --scale=large

set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${BLUE}[seed]${NC} $*"; }
ok()  { echo -e "${GREEN}[ok]${NC} $*"; }
err() { echo -e "${RED}[err]${NC} $*" >&2; }

TENANT="demo"
SCALE="small"
for arg in "$@"; do
  case "$arg" in
    --tenant=*) TENANT="${arg#*=}" ;;
    --scale=*)  SCALE="${arg#*=}" ;;
    *) err "דגל לא מוכר: $arg"; exit 1 ;;
  esac
done

# ודא ש-Postgres חי
if ! docker exec catering_postgres pg_isready -U catering -d catering_dev >/dev/null 2>&1; then
  err "Postgres לא רץ. הריצו תחילה: ./scripts/start-dev.sh"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$ROOT_DIR/.." && pwd)"
cd "$REPO_ROOT"

log "זורע tenant=$TENANT, scale=$SCALE..."

# מנסה דרך הסקריפט הרגיל; ואם אין — דרך pnpm --filter ישירות לחבילת seed-data.
if pnpm run | grep -qE '^\s+db:seed'; then
  pnpm db:seed -- --tenant="$TENANT" --scale="$SCALE"
else
  log "אין סקריפט db:seed; מנסה pnpm --filter @aneh/seed-data run seed:$SCALE"
  pnpm --filter @aneh/seed-data run "seed:$SCALE"
fi

ok "Seed הושלם. tenant=$TENANT, scale=$SCALE"
