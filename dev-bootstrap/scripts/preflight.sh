#!/usr/bin/env bash
# preflight.sh
# בדיקת מערכת לפני הפעלת start-dev.sh.
# נכשל אם משהו חיוני חסר; מזהיר על דברים שאינם קריטיים.

set -uo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
ERRORS=0; WARNINGS=0

ok()    { echo -e "  ${GREEN}✓${NC} $*"; }
fail()  { echo -e "  ${RED}✗${NC} $*"; ERRORS=$((ERRORS+1)); }
warn()  { echo -e "  ${YELLOW}!${NC} $*"; WARNINGS=$((WARNINGS+1)); }
section(){ echo -e "\n${BLUE}${BOLD}▸ $*${NC}"; }

# ===== Node =====
section "Node.js"
if command -v node >/dev/null 2>&1; then
  NODE_V=$(node --version | sed 's/^v//')
  NODE_MAJOR=${NODE_V%%.*}
  if [[ $NODE_MAJOR -ge 22 ]]; then
    ok "Node $NODE_V"
  else
    fail "Node $NODE_V — נדרש 22+ (יש לעדכן: https://nodejs.org)"
  fi
else
  fail "Node לא מותקן — התקינו 22 או גבוה יותר"
fi

# ===== pnpm =====
section "pnpm"
if command -v pnpm >/dev/null 2>&1; then
  PNPM_V=$(pnpm --version)
  PNPM_MAJOR=${PNPM_V%%.*}
  if [[ $PNPM_MAJOR -ge 9 ]]; then
    ok "pnpm $PNPM_V"
  else
    fail "pnpm $PNPM_V — נדרש 9+ (npm i -g pnpm@latest)"
  fi
else
  fail "pnpm לא מותקן — npm i -g pnpm@latest"
fi

# ===== Docker =====
section "Docker"
if command -v docker >/dev/null 2>&1; then
  DOCKER_V=$(docker --version 2>/dev/null || echo "n/a")
  ok "$DOCKER_V"
  if docker info >/dev/null 2>&1; then
    ok "Docker daemon רץ"
  else
    fail "Docker daemon לא רץ — הפעילו Docker Desktop / שירות docker"
  fi
else
  fail "Docker לא מותקן — https://www.docker.com/products/docker-desktop"
fi

# ===== docker compose =====
section "docker compose"
if docker compose version >/dev/null 2>&1; then
  ok "$(docker compose version --short 2>/dev/null || docker compose version)"
else
  fail "docker compose לא זמין (compose v2 נדרש)"
fi

# ===== git =====
section "git"
if command -v git >/dev/null 2>&1; then
  ok "$(git --version)"
else
  warn "git לא מותקן — לא חיוני, אך מומלץ"
fi

# ===== פורטים פנויים =====
section "פורטים פנויים"
check_port() {
  local port=$1
  local label=$2
  # OS-cross-platform: lsof אם יש, אחרת netstat, אחרת ss
  local in_use=""
  if command -v lsof >/dev/null 2>&1; then
    in_use=$(lsof -iTCP:"$port" -sTCP:LISTEN -P -n 2>/dev/null | tail -n +2 | head -1)
  elif command -v ss >/dev/null 2>&1; then
    in_use=$(ss -ltn 2>/dev/null | awk '{print $4}' | grep -E "[:.]$port$" | head -1)
  elif command -v netstat >/dev/null 2>&1; then
    in_use=$(netstat -an 2>/dev/null | grep -E "[:.]$port[[:space:]]" | grep -i listen | head -1)
  fi
  if [[ -z "$in_use" ]]; then
    ok "פורט $port פנוי ($label)"
  else
    warn "פורט $port תפוס ($label) — ייתכן שיש שירות אחר שתופס אותו"
  fi
}

check_port 3000 "Next.js dev"
check_port 5432 "Postgres"
check_port 6379 "Redis"
check_port 8025 "MailHog UI"
check_port 1025 "MailHog SMTP"
check_port 9000 "MinIO API"
check_port 9001 "MinIO Console"

# ===== זיכרון =====
section "זיכרון (4GB+ מומלץ ל-Docker, 8GB+ למונורפו מלא)"
MEM_GB=""
if [[ "$(uname -s 2>/dev/null)" == "Linux" ]]; then
  MEM_GB=$(awk '/MemTotal/ {printf "%d", $2/1024/1024}' /proc/meminfo 2>/dev/null || echo "")
elif [[ "$(uname -s 2>/dev/null)" == "Darwin" ]]; then
  MEM_GB=$(( $(sysctl -n hw.memsize 2>/dev/null || echo 0) / 1024 / 1024 / 1024 ))
elif command -v wmic >/dev/null 2>&1; then
  # Windows (Git Bash)
  MEM_KB=$(wmic computersystem get totalphysicalmemory 2>/dev/null | tr -d ' \r' | grep -E '^[0-9]+$' | head -1)
  MEM_GB=$(( ${MEM_KB:-0} / 1024 / 1024 / 1024 ))
fi
if [[ -n "$MEM_GB" && "$MEM_GB" -ge 8 ]]; then
  ok "זיכרון: ${MEM_GB}GB"
elif [[ -n "$MEM_GB" && "$MEM_GB" -ge 4 ]]; then
  warn "זיכרון: ${MEM_GB}GB — מומלץ 8GB+"
elif [[ -n "$MEM_GB" ]]; then
  fail "זיכרון: ${MEM_GB}GB — נדרש 4GB+"
else
  warn "לא זוהה גודל זיכרון"
fi

# ===== שטח דיסק =====
section "שטח דיסק"
if command -v df >/dev/null 2>&1; then
  AVAIL_KB=$(df -k . 2>/dev/null | tail -1 | awk '{print $4}')
  AVAIL_GB=$(( ${AVAIL_KB:-0} / 1024 / 1024 ))
  if [[ "$AVAIL_GB" -ge 10 ]]; then
    ok "פנוי: ${AVAIL_GB}GB"
  elif [[ "$AVAIL_GB" -ge 5 ]]; then
    warn "פנוי: ${AVAIL_GB}GB — מומלץ 10GB+"
  else
    fail "פנוי: ${AVAIL_GB}GB — נדרש 10GB+"
  fi
fi

# ===== סיכום =====
echo
echo -e "${BOLD}===== preflight =====${NC}"
echo -e "  ${RED}שגיאות:${NC} $ERRORS"
echo -e "  ${YELLOW}אזהרות:${NC} $WARNINGS"

if [[ $ERRORS -gt 0 ]]; then
  echo -e "\n${RED}${BOLD}תקנו את השגיאות לעיל לפני המשך.${NC}"
  exit 1
fi

if [[ $WARNINGS -gt 0 ]]; then
  echo -e "\n${YELLOW}אפשר להמשיך, אך שימו לב לאזהרות.${NC}"
fi
exit 0
