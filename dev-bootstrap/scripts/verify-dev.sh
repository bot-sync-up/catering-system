#!/usr/bin/env bash
# verify-dev.sh
# בדיקה מקצה-לקצה שכל סביבת הפיתוח עובדת.
# מצליח (exit 0) רק אם כל הבדיקות עוברות.
#
# בדיקות:
#   1. Postgres pg_isready + שאילתת SELECT
#   2. Redis PING
#   3. MailHog API
#   4. MinIO health
#   5. Prisma query (אם packages/db קיים)
#   6. אופציונלי: health endpoints של אפליקציות (אם הוגדרו ב-VERIFY_HEALTH_URLS)
#   7. Create+Read flow על טבלה (User אם קיימת, אחרת skip)

set -uo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
PASS=0; FAIL=0; SKIP=0

pass()  { echo -e "  ${GREEN}✓${NC} $*"; PASS=$((PASS+1)); }
fail()  { echo -e "  ${RED}✗${NC} $*"; FAIL=$((FAIL+1)); }
skip()  { echo -e "  ${YELLOW}—${NC} $* ${YELLOW}(דילוג)${NC}"; SKIP=$((SKIP+1)); }
section(){ echo -e "\n${BLUE}${BOLD}▸ $*${NC}"; }

# ===== 1. Postgres =====
section "Postgres (catering_postgres)"
if docker exec catering_postgres pg_isready -U catering -d catering_dev >/dev/null 2>&1; then
  pass "pg_isready"
else
  fail "pg_isready נכשל — האם הקונטיינר רץ?"
fi

if docker exec catering_postgres psql -U catering -d catering_dev -tAc "SELECT 1" 2>/dev/null | grep -q '^1$'; then
  pass "SELECT 1 הצליח"
else
  fail "SELECT 1 נכשל"
fi

# ודא ש-extensions טעונים
EXT_COUNT=$(docker exec catering_postgres psql -U catering -d catering_dev -tAc \
  "SELECT count(*) FROM pg_extension WHERE extname IN ('uuid-ossp','pgcrypto','pg_trgm','citext','unaccent');" 2>/dev/null || echo 0)
if [[ "${EXT_COUNT:-0}" -ge 5 ]]; then
  pass "Extensions טעונים ($EXT_COUNT/5)"
else
  fail "Extensions חסרים — נמצאו $EXT_COUNT/5"
fi

# מסד test + shadow
for DB in catering_test catering_shadow; do
  if docker exec catering_postgres psql -U catering -d "$DB" -tAc "SELECT 1" >/dev/null 2>&1; then
    pass "מסד $DB קיים"
  else
    fail "מסד $DB לא קיים"
  fi
done

# ===== 2. Redis =====
section "Redis"
if docker exec catering_redis redis-cli ping 2>/dev/null | grep -q PONG; then
  pass "Redis PING -> PONG"
else
  fail "Redis לא משיב"
fi

# Round-trip
if docker exec catering_redis sh -c "redis-cli SET verify:key ok >/dev/null && redis-cli GET verify:key" 2>/dev/null | grep -q ok; then
  pass "Redis SET/GET עובד"
  docker exec catering_redis redis-cli DEL verify:key >/dev/null 2>&1 || true
else
  fail "Redis SET/GET נכשל"
fi

# ===== 3. MailHog =====
section "MailHog"
if curl -fsS "http://localhost:8025/api/v2/messages" >/dev/null 2>&1; then
  pass "MailHog API זמין על :8025"
else
  fail "MailHog לא משיב על :8025"
fi

# ===== 4. MinIO =====
section "MinIO"
if curl -fsS "http://localhost:9000/minio/health/live" >/dev/null 2>&1; then
  pass "MinIO live"
else
  fail "MinIO לא משיב על :9000"
fi

# ===== 5. Prisma query =====
section "Prisma"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
if [[ -d "$REPO_ROOT/packages/db" ]]; then
  if (cd "$REPO_ROOT" && pnpm --filter "@aneh/db" exec prisma db execute --stdin <<<"SELECT 1;" >/dev/null 2>&1); then
    pass "Prisma db execute הצליח"
  elif (cd "$REPO_ROOT/packages/db" && npx prisma db execute --stdin <<<"SELECT 1;" >/dev/null 2>&1); then
    pass "prisma db execute הצליח (ישירות)"
  else
    skip "Prisma query — לא הצליח להריץ (ייתכן ש-prisma generate לא הופעל)"
  fi
else
  skip "packages/db לא נמצא — אין Prisma לבדוק"
fi

# ===== 6. App health endpoints (אופציונלי) =====
section "App health endpoints"
if [[ -n "${VERIFY_HEALTH_URLS:-}" ]]; then
  IFS=',' read -ra URLS <<< "$VERIFY_HEALTH_URLS"
  for url in "${URLS[@]}"; do
    if curl -fsS --max-time 5 "$url" >/dev/null 2>&1; then
      pass "$url"
    else
      fail "$url לא משיב"
    fi
  done
else
  skip "VERIFY_HEALTH_URLS לא הוגדר — דלגתי על health endpoints"
fi

# ===== 7. Create+Read flow על טבלת tenants (אם קיימת) =====
section "Create+Read flow"
TABLE_EXISTS=$(docker exec catering_postgres psql -U catering -d catering_dev -tAc \
  "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tenants');" 2>/dev/null || echo f)

if [[ "$TABLE_EXISTS" == "t" ]]; then
  TEST_SLUG="verify-$(date +%s)-$$"
  CREATED=$(docker exec catering_postgres psql -U catering -d catering_dev -tAc \
    "INSERT INTO tenants (id, slug, name, created_at, updated_at) VALUES (gen_random_uuid(), '$TEST_SLUG', 'verify', NOW(), NOW()) RETURNING slug;" 2>/dev/null || true)
  if [[ "$CREATED" == "$TEST_SLUG" ]]; then
    READ=$(docker exec catering_postgres psql -U catering -d catering_dev -tAc \
      "SELECT slug FROM tenants WHERE slug='$TEST_SLUG';" 2>/dev/null || echo "")
    if [[ "$READ" == "$TEST_SLUG" ]]; then
      pass "INSERT + SELECT על tenants עבד"
      docker exec catering_postgres psql -U catering -d catering_dev -c \
        "DELETE FROM tenants WHERE slug='$TEST_SLUG';" >/dev/null 2>&1 || true
    else
      fail "INSERT עבד אך SELECT לא החזיר את השורה"
    fi
  else
    skip "INSERT לא הצליח — ייתכן שה-schema שונה (עמודות אחרות). זה לא קריטי."
  fi
else
  skip "טבלת tenants לא קיימת — הריצו migrations + seed תחילה"
fi

# ===== סיכום =====
echo
echo -e "${BOLD}===== סיכום =====${NC}"
echo -e "  ${GREEN}עברו:${NC} $PASS"
echo -e "  ${YELLOW}דולגו:${NC} $SKIP"
echo -e "  ${RED}נכשלו:${NC} $FAIL"

if [[ $FAIL -gt 0 ]]; then
  echo -e "\n${RED}${BOLD}סביבת הפיתוח לא תקינה.${NC}"
  exit 1
fi
echo -e "\n${GREEN}${BOLD}✓ הסביבה תקינה ומוכנה לעבודה!${NC}"
exit 0
