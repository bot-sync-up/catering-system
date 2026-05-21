#!/usr/bin/env bash
# reset-dev.sh
# *** הרסני! *** מוחק את כל ה-volumes (postgres_data, redis_data, minio_data)
# ומאתחל את המסד מהתחלה. שימוש: כאשר ה-schema השתנה או הנתונים נפסלו.
#
# דגלים:
#   --yes / -y    דילוג על אישור (לשימוש ב-CI)

set -euo pipefail

RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'; NC='\033[0m'
err()  { echo -e "${RED}[reset]${NC} $*" >&2; }
warn() { echo -e "${YELLOW}[reset]${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC} $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

AUTO_YES=false
for arg in "$@"; do
  case "$arg" in
    -y|--yes) AUTO_YES=true ;;
    *) err "דגל לא מוכר: $arg"; exit 1 ;;
  esac
done

warn "⚠️  פעולה זו תמחק את כל נתוני ה-DB, Redis ו-MinIO המקומיים!"
if ! $AUTO_YES; then
  read -r -p "להמשיך? הקלידו 'RESET' כדי לאשר: " CONFIRM
  if [[ "$CONFIRM" != "RESET" ]]; then
    err "בוטל."
    exit 1
  fi
fi

warn "עוצר ומוחק volumes..."
docker compose -f docker/docker-compose.dev.yml down -v --remove-orphans

ok "אופס מלא הושלם. להפעלה מחדש: ./scripts/start-dev.sh"
