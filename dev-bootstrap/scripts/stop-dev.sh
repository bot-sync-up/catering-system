#!/usr/bin/env bash
# stop-dev.sh
# עוצר את כל שירותי הפיתוח (Docker) בלי למחוק נתונים.
# הנתונים נשמרים ב-volumes; הפעלה מחדש עם start-dev.sh תחזיר את הכל.

set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; NC='\033[0m'
log() { echo -e "${BLUE}[stop-dev]${NC} $*"; }
ok()  { echo -e "${GREEN}[ok]${NC} $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

log "עוצר Docker services..."
docker compose -f docker/docker-compose.dev.yml down --remove-orphans
ok "כל השירותים נעצרו. הנתונים נשמרו ב-volumes."
