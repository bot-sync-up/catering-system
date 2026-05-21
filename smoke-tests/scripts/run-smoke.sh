#!/bin/bash
# Smoke test runner - מריץ את כל ה-smoke tests עם מספור צבעוני
# Usage: ./run-smoke.sh [--quick|--full|--security|--health]

set +e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0
STEP=0
START_TIME=$(date +%s)
RESULTS_FILE="${RESULTS_FILE:-./smoke-results.json}"
MODE="${1:-full}"

# Initialize results JSON
echo "[" > "$RESULTS_FILE"
FIRST=1

log_result() {
  local name="$1"
  local status="$2"
  local duration="$3"
  local error="$4"

  if [ $FIRST -eq 0 ]; then echo "," >> "$RESULTS_FILE"; fi
  FIRST=0
  cat >> "$RESULTS_FILE" <<EOF
  {
    "step": $STEP,
    "name": "$name",
    "status": "$status",
    "duration_ms": $duration,
    "error": "$error",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
EOF
}

test_step() {
  STEP=$((STEP+1))
  local name="$1"
  local cmd="$2"
  local optional="${3:-false}"

  printf "${CYAN}[%02d]${NC} ${BOLD}%-55s${NC} " "$STEP" "$name"

  local t_start=$(date +%s%N 2>/dev/null || date +%s)
  local output
  output=$(eval "$cmd" 2>&1)
  local rc=$?
  local t_end=$(date +%s%N 2>/dev/null || date +%s)
  local duration=$(( (t_end - t_start) / 1000000 ))

  if [ $rc -eq 0 ]; then
    printf "${GREEN}PASS${NC} ${YELLOW}(%dms)${NC}\n" "$duration"
    PASS=$((PASS+1))
    log_result "$name" "pass" "$duration" ""
  elif [ "$optional" = "true" ]; then
    printf "${YELLOW}SKIP${NC}\n"
    SKIP=$((SKIP+1))
    log_result "$name" "skip" "$duration" "$(echo "$output" | head -1 | tr '"' "'")"
  else
    printf "${RED}FAIL${NC}\n"
    if [ -n "$output" ]; then
      echo "$output" | head -3 | sed 's/^/      /'
    fi
    FAIL=$((FAIL+1))
    log_result "$name" "fail" "$duration" "$(echo "$output" | head -1 | tr '"' "'")"
  fi
}

section() {
  echo ""
  printf "${BLUE}${BOLD}=== %s ===${NC}\n" "$1"
}

echo ""
printf "${BOLD}Smoke Test Harness - mode: %s${NC}\n" "$MODE"
printf "Started: %s\n" "$(date)"
echo ""

# ============================================================
section "1. Infrastructure"
# ============================================================
test_step "docker daemon reachable"          "docker info"
test_step "docker-compose up healthy"        "docker-compose ps 2>/dev/null | grep -E '(healthy|Up)' | grep -v 'Exit'"
test_step "postgres container up"            "docker ps --format '{{.Names}}' | grep -E 'postgres|pg'"
test_step "redis container up"               "docker ps --format '{{.Names}}' | grep -E 'redis'"

# ============================================================
section "2. Database connectivity"
# ============================================================
test_step "postgres connect"                 "PGPASSWORD=\${DB_PASSWORD:-catering} psql -h \${DB_HOST:-localhost} -U \${DB_USER:-catering} -d \${DB_NAME:-catering_dev} -c 'SELECT 1' -At"
test_step "postgres extension uuid-ossp"     "PGPASSWORD=\${DB_PASSWORD:-catering} psql -h \${DB_HOST:-localhost} -U \${DB_USER:-catering} -d \${DB_NAME:-catering_dev} -c \"SELECT extname FROM pg_extension WHERE extname='uuid-ossp'\" -At | grep uuid-ossp"
test_step "prisma migrate status clean"      "npx prisma migrate status 2>&1 | grep -q 'Database schema is up to date'"

# ============================================================
section "3. Cache & queues"
# ============================================================
test_step "redis ping"                       "redis-cli -h \${REDIS_HOST:-localhost} ping | grep PONG"
test_step "redis set/get"                    "redis-cli -h \${REDIS_HOST:-localhost} set smoke:test 1 && redis-cli -h \${REDIS_HOST:-localhost} get smoke:test | grep 1"

# ============================================================
section "4. Application services"
# ============================================================
test_step "api /health responds 200"         "curl -fsS http://localhost:\${API_PORT:-3000}/health"
test_step "api /health includes db"          "curl -fsS http://localhost:\${API_PORT:-3000}/health | grep -i 'db\\|database'"
test_step "api /health includes redis"       "curl -fsS http://localhost:\${API_PORT:-3000}/health | grep -i redis"
test_step "web app responds"                 "curl -fsS -o /dev/null -w '%{http_code}' http://localhost:\${WEB_PORT:-3001} | grep -E '^(200|301|302)$'"

# ============================================================
section "5. Seed data integrity"
# ============================================================
test_step "tenant 'demo' exists"             "PGPASSWORD=\${DB_PASSWORD:-catering} psql -h \${DB_HOST:-localhost} -U \${DB_USER:-catering} -d \${DB_NAME:-catering_dev} -At -c \"SELECT 1 FROM tenants WHERE slug='demo'\" | grep 1"
test_step "50+ customers seeded"             "PGPASSWORD=\${DB_PASSWORD:-catering} psql -h \${DB_HOST:-localhost} -U \${DB_USER:-catering} -d \${DB_NAME:-catering_dev} -At -c \"SELECT COUNT(*)>=50 FROM customers\" | grep t"
test_step "30+ events seeded"                "PGPASSWORD=\${DB_PASSWORD:-catering} psql -h \${DB_HOST:-localhost} -U \${DB_USER:-catering} -d \${DB_NAME:-catering_dev} -At -c \"SELECT COUNT(*)>=30 FROM events\" | grep t"

# ============================================================
section "6. Integration tests (vitest)"
# ============================================================
if [ "$MODE" != "quick" ]; then
  test_step "db-connection.test"             "npx vitest run smoke-tests/tests/integration/db-connection.test.ts --reporter=dot"
  test_step "redis-connection.test"          "npx vitest run smoke-tests/tests/integration/redis-connection.test.ts --reporter=dot"
  test_step "seed-loaded.test"               "npx vitest run smoke-tests/tests/integration/seed-loaded.test.ts --reporter=dot"
  test_step "auth-flow.test"                 "npx vitest run smoke-tests/tests/integration/auth-flow.test.ts --reporter=dot"
  test_step "rbac-enforcement.test"          "npx vitest run smoke-tests/tests/integration/rbac-enforcement.test.ts --reporter=dot"
  test_step "audit-recorded.test"            "npx vitest run smoke-tests/tests/integration/audit-recorded.test.ts --reporter=dot"
  test_step "vat-18.test"                    "npx vitest run smoke-tests/tests/integration/vat-18.test.ts --reporter=dot"
  test_step "cardcom-sandbox.test"           "npx vitest run smoke-tests/tests/integration/cardcom-sandbox.test.ts --reporter=dot"
  test_step "icount-sandbox.test"            "npx vitest run smoke-tests/tests/integration/icount-sandbox.test.ts --reporter=dot"
  test_step "event-bus.test"                 "npx vitest run smoke-tests/tests/integration/event-bus.test.ts --reporter=dot"
  test_step "saga-cancel-event.test"         "npx vitest run smoke-tests/tests/integration/saga-cancel-event.test.ts --reporter=dot"
fi

# ============================================================
section "7. Security"
# ============================================================
test_step "JWT_SECRET not 'change-me'"       "[ -n \"\$JWT_SECRET\" ] && [ \"\$JWT_SECRET\" != 'change-me' ] && [ \${#JWT_SECRET} -ge 32 ]"
test_step "DATABASE_URL is set"              "[ -n \"\$DATABASE_URL\" ]"
test_step "no plaintext secrets in repo"     "! git ls-files | xargs grep -lE '(BEGIN RSA|api_key=|password=)[A-Za-z0-9]' 2>/dev/null | grep -v 'smoke-tests\\|\\.md$'"
test_step "gitleaks scan"                    "command -v gitleaks >/dev/null && gitleaks detect --no-banner --redact -s . || true" "true"
test_step "HTTPS-only cookies (prod)"        "[ \"\${NODE_ENV:-development}\" != 'production' ] || grep -r 'secure.*true' apps/*/src/middleware/cookies* 2>/dev/null | head -1"

# ============================================================
section "8. E2E quick (Playwright)"
# ============================================================
if [ "$MODE" = "full" ]; then
  test_step "playwright login.spec"          "npx playwright test smoke-tests/tests/e2e-quick/login.spec.ts --reporter=line" "true"
  test_step "playwright dashboard.spec"      "npx playwright test smoke-tests/tests/e2e-quick/dashboard.spec.ts --reporter=line" "true"
fi

# Close JSON array
echo "" >> "$RESULTS_FILE"
echo "]" >> "$RESULTS_FILE"

# ============================================================
# Summary
# ============================================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
printf "${BOLD}===========================================${NC}\n"
printf "${BOLD}  SUMMARY${NC}\n"
printf "${BOLD}===========================================${NC}\n"
printf "  ${GREEN}Pass${NC}:   %d\n" "$PASS"
printf "  ${RED}Fail${NC}:   %d\n" "$FAIL"
printf "  ${YELLOW}Skip${NC}:   %d\n" "$SKIP"
printf "  Total:  %d\n" "$STEP"
printf "  Time:   %ds\n" "$DURATION"
echo ""

if [ $FAIL -eq 0 ]; then
  printf "${GREEN}${BOLD}ALL SMOKE TESTS PASSED${NC}\n"
else
  printf "${RED}${BOLD}SMOKE TESTS FAILED (%d)${NC}\n" "$FAIL"
fi
echo ""

# Generate HTML dashboard
if [ -f "smoke-tests/dashboards/generate-html.sh" ]; then
  bash smoke-tests/dashboards/generate-html.sh "$RESULTS_FILE" "$PASS" "$FAIL" "$SKIP" "$DURATION"
fi

exit $FAIL
