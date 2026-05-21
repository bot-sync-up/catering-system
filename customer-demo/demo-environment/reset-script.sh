#!/usr/bin/env bash
# Reset demo tenant state before sales meeting.
# Hebrew RTL comments inside.

set -euo pipefail

DEMO_DOMAIN="${1:-demo-default.syncup.co.il}"
API_BASE="${SYNCUP_API_BASE:-https://api.syncup.co.il}"
ADMIN_TOKEN="${SYNCUP_ADMIN_TOKEN:?missing SYNCUP_ADMIN_TOKEN}"

echo "==> איפוס demo tenant: $DEMO_DOMAIN"

# 1. נקה תורי job ו-webhooks ממתינים
curl -sS -X POST "$API_BASE/admin/demo/$DEMO_DOMAIN/queues/purge" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"queues":["webhooks","emails","sms","whatsapp"]}'

# 2. החזר נתוני seed למצב התחלתי
curl -sS -X POST "$API_BASE/admin/demo/$DEMO_DOMAIN/seed/restore" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 3. סובב tokens חדשים
NEW_PK=$(curl -sS -X POST "$API_BASE/admin/demo/$DEMO_DOMAIN/tokens/rotate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.public_key')

# 4. עדכן credentials.md אוטומטית
sed -i "s|demo_pk_test_[a-z0-9_]*|$NEW_PK|" ./customer-demo/demo-environment/credentials.md

# 5. בדיקת תקינות מהירה
./customer-demo/demo-environment/health-check.sh "$DEMO_DOMAIN"

echo "==> איפוס הושלם. סביבת הדמו מוכנה לפגישה."
