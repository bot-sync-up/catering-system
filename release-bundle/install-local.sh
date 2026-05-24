#!/usr/bin/env bash
# =============================================================================
#  install-local.sh — התקנה מקומית של מערכת ניהול הקייטרינג
#  שימוש:
#    curl -fsSL https://raw.githubusercontent.com/bot-sync-up/catering/main/install-local.sh | bash
#  או:
#    bash install-local.sh
# =============================================================================
set -euo pipefail

# ---------- צבעים + עברית ----------
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'
BOLD=$'\033[1m'
NC=$'\033[0m'

OK="🟢"
FAIL="🔴"
WARN="🟡"
INFO="ℹ️ "
STAR="⭐"

REPO_URL="${REPO_URL:-https://github.com/bot-sync-up/catering.git}"
BRANCH="${BRANCH:-main}"
TARGET_DIR="${TARGET_DIR:-$HOME/catering}"
NODE_REQUIRED_MAJOR=22
PNPM_REQUIRED_MAJOR=9

log_ok()    { echo -e "${GREEN}${OK} $*${NC}"; }
log_fail()  { echo -e "${RED}${FAIL} $*${NC}"; }
log_warn()  { echo -e "${YELLOW}${WARN} $*${NC}"; }
log_info()  { echo -e "${BLUE}${INFO} $*${NC}"; }
log_step()  { echo -e "\n${BOLD}${STAR} $*${NC}"; }

trap 'log_fail "ההתקנה נכשלה בשורה $LINENO. ראה הודעות שגיאה למעלה."' ERR

# ---------- פתיחה ----------
clear || true
cat <<'BANNER'
╔══════════════════════════════════════════════════════════════════╗
║   מערכת ניהול קייטרינג — התקנה מקומית (YOLO mode)               ║
║   Catering Management System — Local Install                     ║
╚══════════════════════════════════════════════════════════════════╝
BANNER
echo ""

# ---------- 1. Pre-flight ----------
log_step "שלב 1/9: בדיקת דרישות מקדימות"

check_cmd() {
  if command -v "$1" >/dev/null 2>&1; then
    log_ok "נמצא: $1 ($($1 --version 2>&1 | head -n1))"
    return 0
  fi
  return 1
}

missing=0

# Docker
if ! check_cmd docker; then
  log_fail "חסר: docker — התקן את Docker Desktop מ-https://docker.com/products/docker-desktop"
  missing=1
else
  if ! docker info >/dev/null 2>&1; then
    log_fail "Docker מותקן אך לא רץ. הפעל את Docker Desktop ונסה שוב."
    missing=1
  fi
fi

# docker compose (v2)
if docker compose version >/dev/null 2>&1; then
  log_ok "docker compose v2 נמצא"
elif command -v docker-compose >/dev/null 2>&1; then
  log_warn "נמצא docker-compose v1 (ישן) — מומלץ לשדרג ל-v2"
else
  log_fail "חסר: docker compose"
  missing=1
fi

# Git
check_cmd git || { log_fail "חסר: git"; missing=1; }

# Node
if check_cmd node; then
  node_major=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$node_major" -lt "$NODE_REQUIRED_MAJOR" ]; then
    log_warn "Node ${node_major}.x מותקן, אך נדרש ${NODE_REQUIRED_MAJOR}+"
  fi
else
  log_fail "חסר: node — התקן Node ${NODE_REQUIRED_MAJOR}+ מ-https://nodejs.org"
  missing=1
fi

# pnpm
if ! check_cmd pnpm; then
  log_warn "pnpm לא מותקן — מנסה להתקין דרך corepack..."
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@${PNPM_REQUIRED_MAJOR} --activate
    log_ok "pnpm הותקן"
  else
    log_fail "חסר: pnpm — התקן ידנית: npm install -g pnpm"
    missing=1
  fi
fi

# RAM
if [ "$(uname)" = "Linux" ]; then
  ram_gb=$(awk '/MemTotal/ {printf "%.0f", $2/1024/1024}' /proc/meminfo)
  if [ "$ram_gb" -lt 4 ]; then
    log_warn "זוהה רק ${ram_gb}GB RAM. מומלץ 8GB ומעלה."
  else
    log_ok "RAM: ${ram_gb}GB"
  fi
fi

# Disk
free_gb=$(df -BG "$HOME" 2>/dev/null | awk 'NR==2 {gsub("G",""); print $4}')
if [ -n "${free_gb:-}" ] && [ "$free_gb" -lt 10 ]; then
  log_warn "פחות מ-10GB פנויים בדיסק ($HOME)"
fi

[ "$missing" -eq 1 ] && { log_fail "תקן את הדרישות המקדימות ונסה שוב."; exit 1; }

# ---------- 2. Clone ----------
log_step "שלב 2/9: שיבוט הריפו"

if [ -d "$TARGET_DIR/.git" ]; then
  log_warn "תיקיה קיימת: $TARGET_DIR — מבצע git pull"
  git -C "$TARGET_DIR" fetch --all --prune
  git -C "$TARGET_DIR" checkout "$BRANCH"
  git -C "$TARGET_DIR" pull --ff-only
else
  log_info "משבט $REPO_URL → $TARGET_DIR"
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$TARGET_DIR"
fi
log_ok "הריפו מוכן ב-$TARGET_DIR"

cd "$TARGET_DIR"

# ---------- 3. Bootstrap fix-all ----------
log_step "שלב 3/9: הרצת bootstrap/fix-all.sh"
if [ -x "bootstrap/fix-all.sh" ]; then
  bash bootstrap/fix-all.sh
  log_ok "bootstrap הסתיים"
elif [ -f "bootstrap/fix-all.sh" ]; then
  bash bootstrap/fix-all.sh
  log_ok "bootstrap הסתיים"
else
  log_warn "bootstrap/fix-all.sh לא נמצא — מדלג"
fi

# ---------- 4. Patches ----------
log_step "שלב 4/9: החלת patches"
if [ -x "patches-apply/scripts/apply-all-patches.sh" ]; then
  bash patches-apply/scripts/apply-all-patches.sh
  log_ok "patches הוחלו"
elif [ -f "patches-apply/scripts/apply-all-patches.sh" ]; then
  bash patches-apply/scripts/apply-all-patches.sh
  log_ok "patches הוחלו"
else
  log_warn "אין patches להחיל — מדלג"
fi

# ---------- 5. .env ----------
log_step "שלב 5/9: יצירת קובץ .env"
if [ ! -f .env ]; then
  if [ -f .env.dev.example ]; then
    cp .env.dev.example .env
    log_ok ".env נוצר מ-.env.dev.example"
  elif [ -f .env.example ]; then
    cp .env.example .env
    log_ok ".env נוצר מ-.env.example"
  else
    log_warn "לא נמצא קובץ דוגמה ל-.env"
  fi
else
  log_info ".env כבר קיים — לא מחליף"
fi

# ---------- 6. Docker compose ----------
log_step "שלב 6/9: הפעלת Docker services"
COMPOSE_FILE=""
for f in docker-compose.dev.yml docker-compose.yml compose.yml compose.yaml; do
  [ -f "$f" ] && { COMPOSE_FILE="$f"; break; }
done

if [ -n "$COMPOSE_FILE" ]; then
  log_info "משתמש ב-$COMPOSE_FILE"
  docker compose -f "$COMPOSE_FILE" up -d
  log_ok "containers רצים"
  log_info "ממתין 10 שניות שמסד הנתונים יהיה זמין..."
  sleep 10
else
  log_warn "לא נמצא docker-compose.yml — מדלג"
fi

# ---------- 7. pnpm install + migrate + seed ----------
log_step "שלב 7/9: pnpm install + migrate + seed"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
log_ok "תלויות הותקנו"

if pnpm run -r --if-present db:migrate 2>/dev/null; then
  log_ok "migrations רצו"
else
  pnpm db:migrate 2>/dev/null || log_warn "db:migrate לא הצליח / לא קיים"
fi

if pnpm run -r --if-present db:seed 2>/dev/null; then
  log_ok "seed רץ"
else
  pnpm db:seed 2>/dev/null || log_warn "db:seed לא הצליח / לא קיים"
fi

# ---------- 8. dev server ----------
log_step "שלב 8/9: הפעלת dev server"
mkdir -p .yolo-logs
nohup pnpm dev > .yolo-logs/dev.log 2>&1 &
DEV_PID=$!
echo "$DEV_PID" > .yolo-logs/dev.pid
log_ok "dev server רץ ב-PID $DEV_PID (לוג: .yolo-logs/dev.log)"

# ---------- 9. Open browser ----------
log_step "שלב 9/9: פתיחת הדפדפן"
URL="http://localhost:3000"
sleep 3

open_browser() {
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$1" >/dev/null 2>&1 &
  elif command -v open >/dev/null 2>&1; then open "$1" >/dev/null 2>&1 &
  elif command -v wslview >/dev/null 2>&1; then wslview "$1" >/dev/null 2>&1 &
  else log_info "פתח ידנית: $1"
  fi
}
open_browser "$URL" || true
log_ok "הדפדפן נפתח בכתובת $URL"

# ---------- סיכום ----------
cat <<EOF

${GREEN}${BOLD}══════════════════════════════════════════════════════${NC}
${GREEN}${BOLD}  ✅ ההתקנה הסתיימה בהצלחה!${NC}
${GREEN}${BOLD}══════════════════════════════════════════════════════${NC}

  🌐 כתובת:          ${BOLD}${URL}${NC}
  👤 משתמש דמו:      admin@demo.local
  🔑 סיסמה:          admin1234

  📁 תיקיית הפרויקט: ${TARGET_DIR}
  📋 לוג dev:        ${TARGET_DIR}/.yolo-logs/dev.log

  פקודות שימושיות:
    ${BLUE}bash release-bundle/bin/catering-status${NC}
    ${BLUE}bash release-bundle/bin/catering-logs${NC}
    ${BLUE}bash release-bundle/bin/catering-stop${NC}

EOF
