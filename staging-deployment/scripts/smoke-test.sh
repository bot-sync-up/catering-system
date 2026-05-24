#!/usr/bin/env bash
###############################################################################
# smoke-test.sh
#
# בדיקות בריאות בסיסיות אחרי deploy.
#  - health endpoint
#  - login כ-staging user
#  - יצירת order
#  - sandbox payment intent (Stripe test mode)
###############################################################################

set -euo pipefail

: "${STAGING_BASE_URL:=https://api.staging.catering.co.il}"
: "${STAGING_TEST_EMAIL:=smoke-test@staging.catering.co.il}"
: "${STAGING_TEST_PASSWORD:=SmokeTest!2026}"

log()  { printf "\033[1;34m[smoke]\033[0m %s\n" "$*"; }
ok()   { printf "\033[1;32m[smoke]\033[0m %s\n" "$*"; }
fail() { printf "\033[1;31m[smoke]\033[0m %s\n" "$*"; exit 1; }

retry() {
  local max=${1}; shift
  local sleep_s=${1}; shift
  local i=0
  until "$@"; do
    i=$((i+1))
    if (( i >= max )); then return 1; fi
    sleep "$sleep_s"
  done
}

http() {
  curl -fsS --max-time 15 "$@"
}

# ───── 1. health ──────────────────────────────────────────────────────────────
log "health check"
HEALTH=$(http "${STAGING_BASE_URL}/health" || true)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  ok "health OK"
else
  fail "health endpoint failed: ${HEALTH}"
fi

# המתנה לקובץ readiness (פוסט-deploy migrations)
log "waiting for /ready (60s)"
retry 12 5 bash -c "http '${STAGING_BASE_URL}/ready' | grep -q ready" \
  || fail "service not ready after 60s"
ok "service ready"

# ───── 2. login ───────────────────────────────────────────────────────────────
log "login as smoke-test user"
LOGIN_RES=$(http -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${STAGING_TEST_EMAIL}\",\"password\":\"${STAGING_TEST_PASSWORD}\"}" \
  "${STAGING_BASE_URL}/auth/login")

TOKEN=$(echo "$LOGIN_RES" | jq -r '.token // empty')
[[ -z "$TOKEN" ]] && fail "login failed: ${LOGIN_RES}"
ok "login -> token (len=${#TOKEN})"

# ───── 3. create order ────────────────────────────────────────────────────────
log "create order"
ORDER_RES=$(http -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"sku":"smoke-meal","quantity":1,"price":1.00}],
    "delivery_at": "2099-01-01T12:00:00Z",
    "notes":"smoke-test"
  }' \
  "${STAGING_BASE_URL}/orders")

ORDER_ID=$(echo "$ORDER_RES" | jq -r '.id // empty')
[[ -z "$ORDER_ID" ]] && fail "order creation failed: ${ORDER_RES}"
ok "order created id=${ORDER_ID}"

# ───── 4. payment (Stripe sandbox) ────────────────────────────────────────────
log "create payment intent (sandbox)"
PAY_RES=$(http -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"order_id\":\"${ORDER_ID}\",\"amount\":100,\"currency\":\"ILS\",\"sandbox\":true}" \
  "${STAGING_BASE_URL}/payments/intent")

CLIENT_SECRET=$(echo "$PAY_RES" | jq -r '.client_secret // empty')
[[ -z "$CLIENT_SECRET" ]] && fail "payment intent failed: ${PAY_RES}"
ok "payment intent issued"

# ───── 5. cleanup ─────────────────────────────────────────────────────────────
log "cleanup test order"
http -X DELETE \
  -H "Authorization: Bearer ${TOKEN}" \
  "${STAGING_BASE_URL}/orders/${ORDER_ID}" >/dev/null || true

ok "כל בדיקות העישון עברו"
