#!/usr/bin/env bash
###############################################################################
# seed-staging.sh
#
# טעינת נתוני דמו לבסיס הנתונים של staging.
#   - 3 חברות catering
#   - 30 משתמשים (לקוחות + נהגים + admin)
#   - 100 מנות / קטלוג
#   - 20 הזמנות הסטוריות (במצבים שונים)
#   - תזרים תשלומים sandbox
###############################################################################

set -euo pipefail

: "${STAGING_HOST:?STAGING_HOST not set}"
: "${STAGING_USER:=deploy}"
: "${STAGING_SSH_KEY:=$HOME/.ssh/id_ed25519}"
: "${REMOTE_DIR:=/opt/catering-staging}"
: "${RESET:=false}"

remote() {
  ssh -i "$STAGING_SSH_KEY" -o StrictHostKeyChecking=accept-new \
    "${STAGING_USER}@${STAGING_HOST}" "$@"
}

log() { printf "\033[1;34m[seed]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[seed]\033[0m %s\n" "$*"; }

if [[ "${RESET}" == "true" ]]; then
  warn "RESET=true - מאפס בסיס נתונים של staging!"
  read -p "להמשיך? (yes/no): " confirm
  [[ "$confirm" != "yes" ]] && exit 1

  log "מריץ migrate:reset"
  remote "cd ${REMOTE_DIR} && docker compose run --rm api npm run migrate:reset"
fi

log "מריץ migrations"
remote "cd ${REMOTE_DIR} && docker compose run --rm api npm run migrate:up"

log "טוען נתוני דמו (companies + users + catalog + orders)"
remote "cd ${REMOTE_DIR} && docker compose run --rm api npm run seed:staging"

log "וידוא שמשתמש smoke-test קיים"
remote "cd ${REMOTE_DIR} && docker compose run --rm api node -e \"
require('./dist/scripts/ensure-user').ensureUser({
  email: 'smoke-test@staging.catering.co.il',
  password: 'SmokeTest!2026',
  role: 'customer'
});
\""

log "seed הושלם"
