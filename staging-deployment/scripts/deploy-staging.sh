#!/usr/bin/env bash
###############################################################################
# deploy-staging.sh
#
# Pipeline פריסה ל-staging:
#   1. build docker images לכל השירותים
#   2. push ל-registry (GHCR / Docker Hub)
#   3. ssh ל-VPS, sync של docker-compose וקבצי env, docker compose pull+up
#   4. הרצת migrations
#   5. smoke-test
#
# שימוש:
#   ./deploy-staging.sh [--tag <sha>] [--skip-build] [--skip-tests]
###############################################################################

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "${SCRIPT_DIR}/../.." && pwd )"

# ───── Configuration ──────────────────────────────────────────────────────────
: "${STAGING_HOST:?צריך לייצא STAGING_HOST=<ip|fqdn>}"
: "${STAGING_USER:=deploy}"
: "${STAGING_SSH_KEY:=$HOME/.ssh/id_ed25519}"
: "${REGISTRY:=ghcr.io/catering}"
: "${REMOTE_DIR:=/opt/catering-staging}"
: "${SLACK_WEBHOOK_URL:=}"

TAG="${TAG:-$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo latest)}"
SKIP_BUILD=false
SKIP_TESTS=false

# ───── Args ───────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)         TAG="$2"; shift 2 ;;
    --skip-build)  SKIP_BUILD=true; shift ;;
    --skip-tests)  SKIP_TESTS=true; shift ;;
    *) echo "ארגומנט לא מוכר: $1"; exit 2 ;;
  esac
done

# ───── Helpers ────────────────────────────────────────────────────────────────
log()  { printf "\033[1;34m[deploy]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[deploy]\033[0m %s\n" "$*"; }
err()  { printf "\033[1;31m[deploy]\033[0m %s\n" "$*" >&2; }

slack() {
  [[ -z "$SLACK_WEBHOOK_URL" ]] && return 0
  local msg="$1"
  curl -fsS -X POST -H 'Content-Type: application/json' \
    --data "{\"text\":\"[staging] ${msg}\"}" \
    "$SLACK_WEBHOOK_URL" >/dev/null || warn "Slack notify failed"
}

remote() {
  ssh -i "$STAGING_SSH_KEY" -o StrictHostKeyChecking=accept-new \
    "${STAGING_USER}@${STAGING_HOST}" "$@"
}

scp_to() {
  scp -i "$STAGING_SSH_KEY" -o StrictHostKeyChecking=accept-new \
    "$1" "${STAGING_USER}@${STAGING_HOST}:$2"
}

cleanup() {
  local rc=$?
  if (( rc != 0 )); then
    err "deploy נכשל (rc=${rc}) - שקול rollback-staging.sh"
    slack ":x: Deploy ${TAG} FAILED (rc=${rc})"
  fi
}
trap cleanup EXIT

# ───── 1. Build ───────────────────────────────────────────────────────────────
SERVICES=(api portal admin worker)

if ! $SKIP_BUILD; then
  log "building images, tag=${TAG}"
  for svc in "${SERVICES[@]}"; do
    log " - ${svc}"
    docker buildx build \
      --platform linux/amd64 \
      --build-arg GIT_SHA="${TAG}" \
      -t "${REGISTRY}/${svc}:${TAG}" \
      -t "${REGISTRY}/${svc}:staging" \
      --push \
      -f "${PROJECT_ROOT}/services/${svc}/Dockerfile" \
      "${PROJECT_ROOT}/services/${svc}"
  done
else
  warn "skipping build"
fi

# ───── 2. Sync compose + env ──────────────────────────────────────────────────
log "syncing compose / env to ${STAGING_HOST}"
remote "mkdir -p ${REMOTE_DIR}"
scp_to "${SCRIPT_DIR}/../docker-compose.staging.yml" "${REMOTE_DIR}/docker-compose.yml"

# .env.staging מצופה ב-secrets (אסור לעלות ל-git)
if [[ -f "${SCRIPT_DIR}/../.env.staging" ]]; then
  scp_to "${SCRIPT_DIR}/../.env.staging" "${REMOTE_DIR}/.env"
else
  warn ".env.staging לא קיים מקומית - וודאו שהוא קיים על השרת"
fi

# ───── 3. Pull + up ───────────────────────────────────────────────────────────
log "docker compose pull + up"
remote "cd ${REMOTE_DIR} && \
  export TAG=${TAG} && \
  docker compose pull && \
  docker compose up -d --remove-orphans"

# ───── 4. Migrations ──────────────────────────────────────────────────────────
log "running DB migrations"
remote "cd ${REMOTE_DIR} && \
  docker compose run --rm api npm run migrate:up" || {
    err "migrations נכשלו"
    exit 1
  }

# ───── 5. Smoke tests ─────────────────────────────────────────────────────────
if ! $SKIP_TESTS; then
  log "running smoke tests"
  STAGING_BASE_URL="https://api.staging.catering.co.il" \
    bash "${SCRIPT_DIR}/smoke-test.sh"
else
  warn "skipping smoke tests"
fi

# ───── Done ───────────────────────────────────────────────────────────────────
log "deploy ${TAG} OK"
slack ":white_check_mark: Deploy ${TAG} succeeded -> https://staging.catering.co.il"
trap - EXIT
