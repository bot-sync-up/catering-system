#!/usr/bin/env bash
# verify.sh — weekly restore-and-validate drill.
# Pulls the most recent daily backup, restores into a throwaway DB,
# runs a sanity query, then drops the DB. Emits a Prometheus metric.
set -euo pipefail

: "${POSTGRES_HOST:?}"; : "${POSTGRES_USER:?}"; : "${POSTGRES_PASSWORD:?}"
: "${S3_ENDPOINT:?}"; : "${S3_BUCKET:?}"; : "${BACKUP_AGE_IDENTITY:?}"

verify_db="verify_$(date -u +%Y%m%d%H%M%S)"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# Find latest backup
latest=$(aws --endpoint-url "$S3_ENDPOINT" s3 ls "s3://${S3_BUCKET}/postgres/" --recursive \
  | grep '.dump.age$' | sort | tail -n1 | awk '{print $4}')
[ -n "$latest" ] || { echo "no backup found"; exit 1; }

echo "[verify] using s3://${S3_BUCKET}/${latest}"
aws --endpoint-url "$S3_ENDPOINT" s3 cp "s3://${S3_BUCKET}/${latest}" "${work}/dump.age" --only-show-errors
age -d -i "$BACKUP_AGE_IDENTITY" -o "${work}/dump.pgc" "${work}/dump.age"

export PGPASSWORD="$POSTGRES_PASSWORD"
psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${verify_db}\";"
pg_restore -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$verify_db" --jobs=4 --no-owner --exit-on-error "${work}/dump.pgc"

# Sanity checks
tables=$(psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$verify_db" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
echo "[verify] public tables: $tables"
[ "$tables" -gt 0 ] || { echo "no public tables — backup looks empty"; status=fail; }

# Drop verify DB
psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE \"${verify_db}\";"

status="${status:-ok}"
if [ -n "${PUSHGATEWAY_URL:-}" ]; then
  cat <<EOF | curl -fsS --data-binary @- "${PUSHGATEWAY_URL}/metrics/job/backup-verify" || true
backup_verify_last_run_timestamp_seconds $(date -u +%s)
backup_verify_last_status{status="$status"} 1
backup_verify_tables_count $tables
EOF
fi

[ "$status" = "ok" ]
