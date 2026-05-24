#!/usr/bin/env bash
# backup-postgres.sh
# Streams pg_dump (custom format) through age encryption to S3/R2.
# Idempotent: writes a date-stamped object, then prunes per retention policy.
#
# Required env:
#   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
#   S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY
#   BACKUP_AGE_RECIPIENT   (age public key)
# Optional:
#   RETENTION_DAILY=30 RETENTION_MONTHLY=12 RETENTION_YEARLY=7
#
# Usage: ./backup-postgres.sh
set -euo pipefail

: "${POSTGRES_HOST:?required}"
: "${POSTGRES_DB:?required}"
: "${POSTGRES_USER:?required}"
: "${POSTGRES_PASSWORD:?required}"
: "${S3_ENDPOINT:?required}"
: "${S3_BUCKET:?required}"
: "${BACKUP_AGE_RECIPIENT:?required}"

POSTGRES_PORT="${POSTGRES_PORT:-5432}"
RETENTION_DAILY="${RETENTION_DAILY:-30}"
RETENTION_MONTHLY="${RETENTION_MONTHLY:-12}"
RETENTION_YEARLY="${RETENTION_YEARLY:-7}"

ts=$(date -u +%Y%m%dT%H%M%SZ)
date_day=$(date -u +%Y-%m-%d)
day_of_month=$(date -u +%d)
day_of_year=$(date -u +%j)

prefix="postgres/${POSTGRES_DB}"
key="${prefix}/daily/${date_day}/${POSTGRES_DB}-${ts}.dump.age"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

echo "[backup-postgres] dumping ${POSTGRES_DB}@${POSTGRES_HOST}:${POSTGRES_PORT} -> ${key}"

export PGPASSWORD="$POSTGRES_PASSWORD"
pg_dump \
  --host="$POSTGRES_HOST" --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" \
  --format=custom --compress=9 --no-owner --no-privileges \
  --file="${work}/dump.pgc"

sha256sum "${work}/dump.pgc" | awk '{print $1}' > "${work}/dump.sha256"

# Encrypt with age
age -r "$BACKUP_AGE_RECIPIENT" -o "${work}/dump.age" "${work}/dump.pgc"

# Upload via aws cli (works against R2 endpoint)
aws --endpoint-url "$S3_ENDPOINT" \
    s3 cp "${work}/dump.age" "s3://${S3_BUCKET}/${key}" \
    --only-show-errors --metadata "sha256=$(cat ${work}/dump.sha256)"
aws --endpoint-url "$S3_ENDPOINT" \
    s3 cp "${work}/dump.sha256" "s3://${S3_BUCKET}/${key}.sha256" --only-show-errors

# Tag last-of-month / last-of-year copies
if [ "$day_of_month" = "01" ]; then
  aws --endpoint-url "$S3_ENDPOINT" s3 cp \
    "s3://${S3_BUCKET}/${key}" \
    "s3://${S3_BUCKET}/${prefix}/monthly/$(date -u +%Y-%m)/${POSTGRES_DB}-${ts}.dump.age" --only-show-errors
fi
if [ "$day_of_year" = "001" ]; then
  aws --endpoint-url "$S3_ENDPOINT" s3 cp \
    "s3://${S3_BUCKET}/${key}" \
    "s3://${S3_BUCKET}/${prefix}/yearly/$(date -u +%Y)/${POSTGRES_DB}-${ts}.dump.age" --only-show-errors
fi

# Retention prune
prune() {
  local subdir="$1" keep_days="$2"
  aws --endpoint-url "$S3_ENDPOINT" s3 ls "s3://${S3_BUCKET}/${prefix}/${subdir}/" --recursive 2>/dev/null \
    | awk '{print $4}' \
    | while read -r obj; do
        [ -z "$obj" ] && continue
        d=$(echo "$obj" | awk -F/ '{print $(NF-1)}' | tr -d '-' | cut -c1-8)
        [[ "$d" =~ ^[0-9]{8}$ ]] || continue
        age_days=$(( ( $(date -u +%s) - $(date -u -d "${d:0:4}-${d:4:2}-${d:6:2}" +%s 2>/dev/null || echo 0) ) / 86400 ))
        if [ "$age_days" -gt "$keep_days" ]; then
          aws --endpoint-url "$S3_ENDPOINT" s3 rm "s3://${S3_BUCKET}/${obj}" --only-show-errors
        fi
      done
}
prune daily   "$RETENTION_DAILY"
prune monthly "$(( RETENTION_MONTHLY * 31 ))"
prune yearly  "$(( RETENTION_YEARLY * 366 ))"

# Emit metric for Prometheus pushgateway (if available)
if [ -n "${PUSHGATEWAY_URL:-}" ]; then
  printf 'backup_last_success_timestamp_seconds %s\n' "$(date -u +%s)" \
    | curl -fsS --data-binary @- "${PUSHGATEWAY_URL}/metrics/job/backup-postgres" || true
fi

echo "[backup-postgres] done: s3://${S3_BUCKET}/${key}"
