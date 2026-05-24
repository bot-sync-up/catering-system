#!/usr/bin/env bash
# Run db-index-audit.sql and post results to Slack.
set -Eeuo pipefail
: "${DATABASE_URL:?}"

OUT=$(psql "$DATABASE_URL" -f "$(dirname "$0")/db-index-audit.sql")
echo "$OUT"

if [ -n "${SLACK_WEBHOOK:-}" ]; then
  curl -sS -X POST "$SLACK_WEBHOOK" \
    -H 'Content-Type: application/json' \
    --data "$(jq -Rs '{text: ("DB index audit:\n```" + . + "```")}' <<<"$OUT")"
fi
