# shellcheck shell=bash
# common helpers — נטען מכל bin/catering-*
# שימוש: source "$(dirname "$0")/_common.sh"

set -euo pipefail

GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'; BOLD=$'\033[1m'; NC=$'\033[0m'

ok()   { echo -e "${GREEN}🟢 $*${NC}"; }
err()  { echo -e "${RED}🔴 $*${NC}"; }
warn() { echo -e "${YELLOW}🟡 $*${NC}"; }
info() { echo -e "${BLUE}ℹ️  $*${NC}"; }
title(){ echo -e "${BOLD}$*${NC}"; }

# מאתר את שורש האפליקציה (התיקיה שמעל release-bundle/)
find_app_dir() {
  local d
  d="$(cd "$(dirname "${BASH_SOURCE[1]:-${BASH_SOURCE[0]}}")/../.." && pwd)"
  if [ -d "$d/.git" ] || [ -f "$d/package.json" ] || [ -f "$d/docker-compose.yml" ]; then
    echo "$d"; return
  fi
  # fallback ל-CWD
  pwd
}

# מאתר קובץ compose בעדיפות prod → dev → רגיל
find_compose_file() {
  local app_dir="${1:-$(find_app_dir)}"
  for f in docker-compose.prod.yml docker-compose.yml docker-compose.dev.yml compose.yml compose.yaml; do
    [ -f "$app_dir/$f" ] && { echo "$f"; return; }
  done
  echo ""
}

require_docker() {
  command -v docker >/dev/null 2>&1 || { err "docker לא מותקן"; exit 1; }
  docker info >/dev/null 2>&1 || { err "docker daemon לא רץ"; exit 1; }
}
