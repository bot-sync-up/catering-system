#!/usr/bin/env bash
# =============================================================================
#  install-vps.sh — התקנת VPS ראשונית (Ubuntu 24.04 fresh)
#  שימוש (כ-root):
#    ssh root@vps.example.com 'bash <(curl -fsSL https://raw.githubusercontent.com/bot-sync-up/catering/main/install-vps.sh)'
#  או:
#    curl -fsSL https://.../install-vps.sh -o install-vps.sh && bash install-vps.sh
#
#  משתני סביבה אופציונליים:
#    DOMAIN=catering.example.com
#    EMAIL=admin@example.com
#    REPO_URL=https://github.com/bot-sync-up/catering.git
#    APP_USER=catering
# =============================================================================
set -euo pipefail

# ---------- צבעים ----------
RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'; BOLD=$'\033[1m'; NC=$'\033[0m'
OK="🟢"; FAIL="🔴"; WARN="🟡"; INFO="ℹ️ "; STAR="⭐"

log_ok()   { echo -e "${GREEN}${OK} $*${NC}"; }
log_fail() { echo -e "${RED}${FAIL} $*${NC}"; }
log_warn() { echo -e "${YELLOW}${WARN} $*${NC}"; }
log_info() { echo -e "${BLUE}${INFO} $*${NC}"; }
log_step() { echo -e "\n${BOLD}${STAR} $*${NC}"; }

trap 'log_fail "ההתקנה נכשלה בשורה $LINENO"' ERR

# ---------- משתנים ----------
DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"
REPO_URL="${REPO_URL:-https://github.com/bot-sync-up/catering.git}"
BRANCH="${BRANCH:-main}"
APP_USER="${APP_USER:-catering}"
APP_DIR="/home/${APP_USER}/app"
NODE_VERSION=22
PNPM_VERSION=9

# ---------- בדיקה ראשונית ----------
if [ "$(id -u)" -ne 0 ]; then
  log_fail "סקריפט זה חייב לרוץ כ-root. נסה: sudo bash $0"
  exit 1
fi

if ! grep -qi 'ubuntu' /etc/os-release; then
  log_warn "המערכת מזוהה כלא-Ubuntu. הסקריפט נכתב עבור Ubuntu 24.04."
fi

clear || true
cat <<'BANNER'
╔══════════════════════════════════════════════════════════════════╗
║   התקנת VPS — מערכת ניהול קייטרינג (Production)                 ║
║   VPS Production Install (Ubuntu 24.04)                          ║
╚══════════════════════════════════════════════════════════════════╝
BANNER

if [ -z "$DOMAIN" ]; then
  read -rp "🌐 הזן domain (לדוגמה: catering.example.com), או Enter לדלג על SSL: " DOMAIN
fi
if [ -n "$DOMAIN" ] && [ -z "$EMAIL" ]; then
  read -rp "📧 אימייל ל-Let's Encrypt: " EMAIL
fi

# ---------- 1. apt update + base packages ----------
log_step "שלב 1/12: עדכון apt + התקנת חבילות"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget git ca-certificates gnupg lsb-release \
  ufw fail2ban unattended-upgrades \
  nginx certbot python3-certbot-nginx \
  build-essential jq htop tmux vim \
  software-properties-common apt-transport-https \
  cron rsync zip unzip
log_ok "חבילות בסיס הותקנו"

# ---------- Docker ----------
log_step "שלב 2/12: התקנת Docker"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  log_ok "Docker הותקן"
else
  log_info "Docker כבר מותקן"
fi

# ---------- Node + pnpm ----------
log_step "שלב 3/12: Node ${NODE_VERSION} + pnpm ${PNPM_VERSION}"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v//;s/\..*//')" -lt "$NODE_VERSION" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y -qq nodejs
fi
npm install -g pnpm@${PNPM_VERSION} >/dev/null 2>&1 || corepack enable
log_ok "Node $(node -v), pnpm $(pnpm -v)"

# ---------- UFW ----------
log_step "שלב 4/12: חומת אש (UFW)"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
log_ok "UFW מופעל: 22, 80, 443"

# ---------- fail2ban + unattended-upgrades ----------
log_step "שלב 5/12: אבטחה — fail2ban + unattended-upgrades"
systemctl enable --now fail2ban

cat > /etc/apt/apt.conf.d/50unattended-upgrades.local <<'EOF'
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
EOF
systemctl enable --now unattended-upgrades
log_ok "fail2ban + unattended-upgrades פעילים"

# ---------- 6. user 'catering' ----------
log_step "שלב 6/12: יצירת משתמש ${APP_USER}"
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "$APP_USER"
  log_ok "משתמש $APP_USER נוצר"
fi
usermod -aG docker "$APP_USER"

# הרשאות sudo מוגבלות (בלי סיסמה לפקודות שירות בלבד)
cat > /etc/sudoers.d/${APP_USER} <<EOF
${APP_USER} ALL=(root) NOPASSWD: /bin/systemctl restart catering, /bin/systemctl status catering, /usr/sbin/nginx -s reload
EOF
chmod 0440 /etc/sudoers.d/${APP_USER}

# ---------- 7. Clone repo ----------
log_step "שלב 7/12: שיבוט הריפו כ-${APP_USER}"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
else
  sudo -u "$APP_USER" git -C "$APP_DIR" pull --ff-only
fi
log_ok "ריפו ב-$APP_DIR"

# bootstrap + patches
if [ -f "$APP_DIR/bootstrap/fix-all.sh" ]; then
  sudo -u "$APP_USER" bash "$APP_DIR/bootstrap/fix-all.sh" || log_warn "fix-all.sh השאיר אזהרות"
fi
if [ -f "$APP_DIR/patches-apply/scripts/apply-all-patches.sh" ]; then
  sudo -u "$APP_USER" bash "$APP_DIR/patches-apply/scripts/apply-all-patches.sh" || log_warn "patches השאירו אזהרות"
fi

# ---------- 8. Secrets + .env.production ----------
log_step "שלב 8/12: יצירת secrets ו-.env.production"
gen_secret() { openssl rand -base64 48 | tr -d '\n=+/' | head -c 40; }

ENV_FILE="$APP_DIR/.env.production"
if [ ! -f "$ENV_FILE" ]; then
  DB_PASSWORD=$(gen_secret)
  JWT_SECRET=$(gen_secret)
  SESSION_SECRET=$(gen_secret)
  REDIS_PASSWORD=$(gen_secret)
  ENCRYPTION_KEY=$(gen_secret)

  cat > "$ENV_FILE" <<EOF
# Auto-generated by install-vps.sh on $(date -Iseconds)
NODE_ENV=production
PORT=3000

DATABASE_URL=postgres://catering:${DB_PASSWORD}@postgres:5432/catering
POSTGRES_USER=catering
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=catering

REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
REDIS_PASSWORD=${REDIS_PASSWORD}

JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}

DOMAIN=${DOMAIN:-localhost}
PUBLIC_URL=https://${DOMAIN:-localhost}
EOF
  chown "$APP_USER:$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  log_ok ".env.production נוצר עם secrets חזקים"
else
  log_info ".env.production קיים — לא מחליף"
fi

# ---------- 9. Docker compose prod up ----------
log_step "שלב 9/12: הפעלת docker-compose.prod.yml"
COMPOSE_PROD=""
for f in docker-compose.prod.yml docker-compose.production.yml docker-compose.yml; do
  [ -f "$APP_DIR/$f" ] && { COMPOSE_PROD="$f"; break; }
done

if [ -n "$COMPOSE_PROD" ]; then
  cd "$APP_DIR"
  sudo -u "$APP_USER" docker compose -f "$COMPOSE_PROD" pull || true
  sudo -u "$APP_USER" docker compose -f "$COMPOSE_PROD" up -d
  log_ok "containers production רצים ($COMPOSE_PROD)"
else
  log_warn "לא נמצא docker-compose.prod.yml"
fi

# ---------- 10. Nginx + certbot ----------
log_step "שלב 10/12: Nginx + Let's Encrypt"
if [ -n "$DOMAIN" ]; then
  cat > /etc/nginx/sites-available/catering <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 50M;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 90s;
    }
}
EOF
  ln -sf /etc/nginx/sites-available/catering /etc/nginx/sites-enabled/catering
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  log_ok "Nginx מוגדר ל-${DOMAIN}"

  if [ -n "$EMAIL" ]; then
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect || \
      log_warn "certbot נכשל — תוכל להריץ ידנית מאוחר יותר"
  fi
else
  log_warn "אין domain — Nginx + SSL לא מוגדרים"
fi

# ---------- 11. systemd auto-start + cron backups ----------
log_step "שלב 11/12: systemd + cron"
cat > /etc/systemd/system/catering.service <<EOF
[Unit]
Description=Catering Management System
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
User=${APP_USER}
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/docker compose -f ${COMPOSE_PROD:-docker-compose.yml} up -d
ExecStop=/usr/bin/docker compose -f ${COMPOSE_PROD:-docker-compose.yml} down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable catering.service
log_ok "systemd service: catering.service"

# Cron — backup יומי ב-03:00
BACKUP_SCRIPT="${APP_DIR}/release-bundle/backup-now.sh"
mkdir -p /home/${APP_USER}/backups
chown ${APP_USER}:${APP_USER} /home/${APP_USER}/backups
( crontab -u "$APP_USER" -l 2>/dev/null | grep -v 'backup-now.sh' ; \
  echo "0 3 * * * bash ${BACKUP_SCRIPT} >> /home/${APP_USER}/backups/cron.log 2>&1" \
) | crontab -u "$APP_USER" -
log_ok "cron backup יומי ב-03:00"

# ---------- 12. Prometheus + Grafana ----------
log_step "שלב 12/12: Prometheus + Grafana"
MONITORING_DIR="${APP_DIR}/monitoring"
if [ ! -d "$MONITORING_DIR" ]; then
  sudo -u "$APP_USER" mkdir -p "$MONITORING_DIR"
  cat > "${MONITORING_DIR}/docker-compose.monitoring.yml" <<'EOF'
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: catering-prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prom-data:/prometheus
    ports:
      - "127.0.0.1:9090:9090"

  grafana:
    image: grafana/grafana:latest
    container_name: catering-grafana
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-changeme}
    volumes:
      - grafana-data:/var/lib/grafana
    ports:
      - "127.0.0.1:3001:3000"

volumes:
  prom-data:
  grafana-data:
EOF

  cat > "${MONITORING_DIR}/prometheus.yml" <<'EOF'
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: 'catering-app'
    static_configs:
      - targets: ['host.docker.internal:3000']
  - job_name: 'node'
    static_configs:
      - targets: ['host.docker.internal:9100']
EOF
  chown -R "$APP_USER:$APP_USER" "$MONITORING_DIR"
  cd "$MONITORING_DIR"
  sudo -u "$APP_USER" docker compose -f docker-compose.monitoring.yml up -d
  log_ok "Prometheus: 127.0.0.1:9090, Grafana: 127.0.0.1:3001"
else
  log_info "monitoring קיים — מדלג"
fi

# ---------- סיכום ----------
PUBLIC_IP=$(curl -fsSL -m 5 https://api.ipify.org 2>/dev/null || echo "?")
cat <<EOF

${GREEN}${BOLD}══════════════════════════════════════════════════════${NC}
${GREEN}${BOLD}  ✅ ה-VPS מוכן!${NC}
${GREEN}${BOLD}══════════════════════════════════════════════════════${NC}

  🌐 IP ציבורי:       ${PUBLIC_IP}
  🌐 Domain:          ${DOMAIN:-(לא הוגדר)}
  👤 משתמש מערכת:    ${APP_USER}
  📁 קוד:            ${APP_DIR}
  🔐 .env:           ${ENV_FILE} (chmod 600)

  ניהול:
    sudo systemctl status catering
    sudo systemctl restart catering
    sudo -u ${APP_USER} bash ${APP_DIR}/release-bundle/bin/catering-logs

  Grafana (טאנל ssh):
    ssh -L 3001:127.0.0.1:3001 root@<server>
    אז פתח http://localhost:3001 (admin / changeme — שנה!)

  ${YELLOW}⚠️  שמור את ${ENV_FILE} במקום מאובטח! הוא מכיל secrets.${NC}

EOF
