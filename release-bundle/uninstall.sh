#!/usr/bin/env bash
# =============================================================================
#  uninstall.sh — הסרת מערכת הקייטרינג (מקומי או VPS)
#  שימוש:
#    bash uninstall.sh [--keep-data] [--target-dir PATH]
# =============================================================================
set -euo pipefail

RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; NC=$'\033[0m'
OK="🟢"; FAIL="🔴"; WARN="🟡"

log_ok()   { echo -e "${GREEN}${OK} $*${NC}"; }
log_fail() { echo -e "${RED}${FAIL} $*${NC}"; }
log_warn() { echo -e "${YELLOW}${WARN} $*${NC}"; }

KEEP_DATA=0
TARGET_DIR="${TARGET_DIR:-$HOME/catering}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep-data) KEEP_DATA=1; shift ;;
    --target-dir) TARGET_DIR="$2"; shift 2 ;;
    *) log_fail "פרמטר לא מוכר: $1"; exit 1 ;;
  esac
done

cat <<EOF
╔══════════════════════════════════════════════════════════════════╗
║   הסרת מערכת הקייטרינג                                          ║
╚══════════════════════════════════════════════════════════════════╝

  📁 תיקיה:    ${TARGET_DIR}
  💾 שמירת נתונים: $([ "$KEEP_DATA" -eq 1 ] && echo "כן" || echo "לא — מחיקה מלאה!")

EOF

read -rp "האם להמשיך? הקלד 'yes' לאישור: " confirm
[ "$confirm" = "yes" ] || { log_warn "בוטל"; exit 0; }

cd "$TARGET_DIR" 2>/dev/null || { log_warn "התיקיה לא קיימת — אין מה להסיר"; exit 0; }

# ---------- 1. עצור dev server אם קיים ----------
if [ -f .yolo-logs/dev.pid ]; then
  PID=$(cat .yolo-logs/dev.pid)
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" || true
    log_ok "dev server נעצר (PID $PID)"
  fi
fi

# ---------- 2. עצור והסר containers ----------
for f in docker-compose.dev.yml docker-compose.yml docker-compose.prod.yml; do
  if [ -f "$f" ]; then
    if [ "$KEEP_DATA" -eq 1 ]; then
      docker compose -f "$f" down || true
    else
      docker compose -f "$f" down -v --remove-orphans || true
    fi
    log_ok "down: $f"
  fi
done

# ---------- 3. systemd ----------
if [ -f /etc/systemd/system/catering.service ]; then
  if [ "$(id -u)" -eq 0 ]; then
    systemctl disable --now catering.service || true
    rm -f /etc/systemd/system/catering.service
    systemctl daemon-reload
    log_ok "systemd service הוסר"
  else
    log_warn "אין הרשאות root — דלג על systemd"
  fi
fi

# ---------- 4. nginx + certbot ----------
if [ -f /etc/nginx/sites-enabled/catering ] && [ "$(id -u)" -eq 0 ]; then
  rm -f /etc/nginx/sites-enabled/catering /etc/nginx/sites-available/catering
  nginx -t && systemctl reload nginx || true
  log_ok "nginx config הוסר"
fi

# ---------- 5. cron ----------
APP_USER="${APP_USER:-catering}"
if id "$APP_USER" >/dev/null 2>&1 && [ "$(id -u)" -eq 0 ]; then
  crontab -u "$APP_USER" -l 2>/dev/null | grep -v 'catering\|backup-now' | crontab -u "$APP_USER" - || true
  log_ok "cron נוקה"
fi

# ---------- 6. מחיקת תיקיה ----------
if [ "$KEEP_DATA" -eq 1 ]; then
  log_warn "התיקיה נשמרה: $TARGET_DIR"
else
  cd /
  rm -rf "$TARGET_DIR"
  log_ok "תיקיה נמחקה: $TARGET_DIR"
fi

# ---------- 7. ניקוי docker images (אופציונלי) ----------
read -rp "למחוק גם docker images לא בשימוש? (y/N): " prune
if [[ "$prune" =~ ^[Yy]$ ]]; then
  docker system prune -af --volumes || true
  log_ok "docker prune בוצע"
fi

cat <<EOF

${GREEN}══════════════════════════════════════════════════════${NC}
${GREEN}  ✅ ההסרה הסתיימה${NC}
${GREEN}══════════════════════════════════════════════════════${NC}

EOF
