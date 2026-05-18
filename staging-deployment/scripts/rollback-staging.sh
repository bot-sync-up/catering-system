#!/usr/bin/env bash
###############################################################################
# rollback-staging.sh
#
# מחזיר את ה-staging ל-tag הקודם מתוך docker registry.
#   - מאתר את ה-tag הקודם שעובד מ-history (env file PREV_TAG)
#   - מבצע docker compose pull + up עם הגירסה הקודמת
#   - מריץ migrate:down אם צריך
###############################################################################

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

: "${STAGING_HOST:?STAGING_HOST not set}"
: "${STAGING_USER:=deploy}"
: "${STAGING_SSH_KEY:=$HOME/.ssh/id_ed25519}"
: "${REMOTE_DIR:=/opt/catering-staging}"
: "${SLACK_WEBHOOK_URL:=}"

remote() {
  ssh -i "$STAGING_SSH_KEY" -o StrictHostKeyChecking=accept-new \
    "${STAGING_USER}@${STAGING_HOST}" "$@"
}

slack() {
  [[ -z "$SLACK_WEBHOOK_URL" ]] && return 0
  curl -fsS -X POST -H 'Content-Type: application/json' \
    --data "{\"text\":\"[staging] $1\"}" "$SLACK_WEBHOOK_URL" >/dev/null || true
}

log() { printf "\033[1;34m[rollback]\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m[rollback]\033[0m %s\n" "$*" >&2; }

# מציאת tag קודם
PREV_TAG="${PREV_TAG:-}"
if [[ -z "$PREV_TAG" ]]; then
  PREV_TAG=$(remote "cat ${REMOTE_DIR}/.deploy-history.log 2>/dev/null | tail -2 | head -1 | awk '{print \$2}'")
fi

if [[ -z "$PREV_TAG" ]]; then
  err "לא נמצא tag קודם להזרים. ספקו PREV_TAG=<sha>"
  exit 1
fi

log "rolling back ל-tag: ${PREV_TAG}"
slack ":warning: Rollback to ${PREV_TAG} בעיצומו"

# הריצי docker compose עם תג ספציפי
remote "cd ${REMOTE_DIR} && \
  export TAG=${PREV_TAG} && \
  docker compose pull && \
  docker compose up -d --remove-orphans"

# migrate down אם השדרוג כלל סכמה
log "running migrate:down (if any)"
remote "cd ${REMOTE_DIR} && \
  docker compose run --rm api npm run migrate:down -- --to ${PREV_TAG} || true"

# רישום ב-history
remote "echo \"\$(date -Iseconds) ROLLBACK ${PREV_TAG}\" >> ${REMOTE_DIR}/.deploy-history.log"

# smoke
STAGING_BASE_URL="https://api.staging.catering.co.il" \
  bash "${SCRIPT_DIR}/smoke-test.sh" || {
    err "smoke לאחר rollback נכשל - יש לבדוק ידנית"
    slack ":fire: rollback ל-${PREV_TAG} עבר, אבל smoke נכשל"
    exit 2
  }

log "rollback ל-${PREV_TAG} הושלם"
slack ":white_check_mark: Rollback ל-${PREV_TAG} הצליח"
