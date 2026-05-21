#!/usr/bin/env bash
# Health check 5 minutes before sales meeting.

set -euo pipefail

DEMO_DOMAIN="${1:-demo-default.syncup.co.il}"
BASE_URL="https://$DEMO_DOMAIN"

pass=0
fail=0

check() {
  local label="$1"
  local url="$2"
  local expected="${3:-200}"
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" "$url" || echo "000")
  if [[ "$code" == "$expected" ]]; then
    echo "  [OK]   $label ($code)"
    pass=$((pass+1))
  else
    echo "  [FAIL] $label (got $code, want $expected)"
    fail=$((fail+1))
  fi
}

echo "==> בדיקת תקינות: $DEMO_DOMAIN"
check "דף נחיתה"            "$BASE_URL/"
check "התחברות אדמין"        "$BASE_URL/login"
check "API health"          "$BASE_URL/api/health"
check "דשבורד BI"           "$BASE_URL/admin/bi"
check "פורטל לקוחות"          "$BASE_URL/portal"
check "Watermark נראה"       "$BASE_URL/api/demo/watermark-status"
check "Seed data טעון"       "$BASE_URL/api/demo/seed-status"
check "WhatsApp sandbox"    "$BASE_URL/api/integrations/whatsapp/ping"
check "PBX sandbox"         "$BASE_URL/api/integrations/pbx/ping"
check "OCR endpoint"        "$BASE_URL/api/ocr/ping"

echo
echo "==> הושלמו: $pass | נכשלו: $fail"

if [[ $fail -gt 0 ]]; then
  echo "!! אסור להתחיל הדגמה לפני תיקון. הרץ reset-script.sh ובדוק שוב."
  exit 1
fi

echo "✔ סביבת הדמו מוכנה."
