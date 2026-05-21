#!/usr/bin/env bash
# =============================================================================
#  update.sh — עדכון המערכת (git pull + migrate + restart)
#  שימוש:
#    bash update.sh [--branch main] [--no-backup]
# =============================================================================
set -euo pipefail

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; BLUE=$'\033[0;34m'; NC=$'\033[0m'
OK="🟢"; FAIL="🔴"; WARN="🟡"; STAR="⭐"

log_ok()   { echo -e "${GREEN}${OK} $*${NC}"; }
log_fail() { echo -e "${RED}${FAIL} $*${NC}"; }
log_warn() { echo -e "${YELLOW}${WARN} $*${NC}"; }
log_step() { echo -e "\n${STAR} $*"; }

BRANCH="main"
DO_BACKUP=1
TARGET_DIR="${TARGET_DIR:-$(pwd)}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch) BRANCH="$2"; shift 2 ;;
    --no-backup) DO_BACKUP=0; shift ;;
    --dir) TARGET_DIR="$2"; shift 2 ;;
    *) log_fail "פרמטר לא מוכר: $1"; exit 1 ;;
  esac
done

cd "$TARGET_DIR"

[ -d .git ] || { log_fail "$TARGET_DIR איננו ריפו git"; exit 1; }

cat <<EOF
╔══════════════════════════════════════════════════════════════════╗
║   עדכון מערכת הקייטרינג                                         ║
╚══════════════════════════════════════════════════════════════════╝
  📁 תיקיה: ${TARGET_DIR}
  🌿 ענף:    ${BRANCH}
EOF

# ---------- 1. backup לפני update ----------
if [ "$DO_BACKUP" -eq 1 ]; then
  log_step "שלב 1/6: backup לפני עדכון"
  if [ -x release-bundle/backup-now.sh ]; then
    bash release-bundle/backup-now.sh --tag "pre-update-$(date +%Y%m%d-%H%M%S)"
    log_ok "backup הסתיים"
  else
    log_warn "אין backup-now.sh — מדלג"
  fi
fi

# ---------- 2. git pull ----------
log_step "שלב 2/6: git pull"
git fetch --all --prune
CURRENT_SHA=$(git rev-parse HEAD)
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"
NEW_SHA=$(git rev-parse HEAD)

if [ "$CURRENT_SHA" = "$NEW_SHA" ]; then
  log_ok "אין עדכונים — כבר ב-${NEW_SHA:0:8}"
  echo ""; read -rp "להמשיך עם migrate+restart בכל זאת? (y/N): " cont
  [[ "$cont" =~ ^[Yy]$ ]] || exit 0
else
  log_ok "עודכן ${CURRENT_SHA:0:8} → ${NEW_SHA:0:8}"
  echo ""
  log_step "שינויים:"
  git log --oneline "${CURRENT_SHA}..${NEW_SHA}" | head -n 20
fi

# ---------- 3. patches ----------
log_step "שלב 3/6: patches"
if [ -f patches-apply/scripts/apply-all-patches.sh ]; then
  bash patches-apply/scripts/apply-all-patches.sh || log_warn "patches השאירו אזהרות"
fi

# ---------- 4. pnpm install ----------
log_step "שלב 4/6: pnpm install"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
log_ok "תלויות עודכנו"

# ---------- 5. migrate ----------
log_step "שלב 5/6: db:migrate"
pnpm db:migrate 2>/dev/null || pnpm run -r --if-present db:migrate || log_warn "migrate נכשל / לא קיים"

# ---------- 6. restart ----------
log_step "שלב 6/6: restart services"
COMPOSE_FILE=""
for f in docker-compose.prod.yml docker-compose.yml docker-compose.dev.yml; do
  [ -f "$f" ] && { COMPOSE_FILE="$f"; break; }
done

if [ -n "$COMPOSE_FILE" ]; then
  docker compose -f "$COMPOSE_FILE" pull || true
  docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
  log_ok "containers הופעלו מחדש ($COMPOSE_FILE)"
fi

if systemctl is-active catering.service >/dev/null 2>&1; then
  sudo systemctl restart catering.service
  log_ok "systemd service הופעל מחדש"
fi

# ---------- בדיקת בריאות ----------
log_step "בדיקת בריאות"
sleep 5
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/api/health}"
if curl -fsS --max-time 10 "$HEALTH_URL" >/dev/null 2>&1; then
  log_ok "המערכת בריאה: $HEALTH_URL"
else
  log_warn "health check נכשל ב-$HEALTH_URL — בדוק לוגים"
fi

cat <<EOF

${GREEN}══════════════════════════════════════════════════════${NC}
${GREEN}  ✅ העדכון הסתיים${NC}
${GREEN}══════════════════════════════════════════════════════${NC}

  גרסה: ${NEW_SHA:0:8}
  צפיה בלוגים: bash release-bundle/bin/catering-logs

EOF
