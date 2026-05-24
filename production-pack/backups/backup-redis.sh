#!/usr/bin/env bash
# backup-redis.sh — trigger BGSAVE, copy the RDB, encrypt, ship to S3/R2.
set -euo pipefail

: "${REDIS_HOST:?required}"
: "${REDIS_PASSWORD:?required}"
: "${S3_ENDPOINT:?required}"
: "${S3_BUCKET:?required}"
: "${BACKUP_AGE_RECIPIENT:?required}"

REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_RDB_PATH="${REDIS_RDB_PATH:-/data/dump.rdb}"

ts=$(date -u +%Y%m%dT%H%M%SZ)
date_day=$(date -u +%Y-%m-%d)
key="redis/daily/${date_day}/dump-${ts}.rdb.age"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

echo "[backup-redis] BGSAVE ..."
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --no-auth-warning BGSAVE >/dev/null
# Wait until BGSAVE finishes
for i in $(seq 1 300); do
  s=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --no-auth-warning INFO persistence | tr -d '\r' | awk -F: '/^rdb_bgsave_in_progress/{print $2}')
  [ "$s" = "0" ] && break
  sleep 2
done

# Copy snapshot off the live volume — works in compose if we share the redis_data volume
cp "$REDIS_RDB_PATH" "${work}/dump.rdb"

sha256sum "${work}/dump.rdb" | awk '{print $1}' > "${work}/dump.sha256"
age -r "$BACKUP_AGE_RECIPIENT" -o "${work}/dump.age" "${work}/dump.rdb"

aws --endpoint-url "$S3_ENDPOINT" s3 cp "${work}/dump.age" "s3://${S3_BUCKET}/${key}" \
  --only-show-errors --metadata "sha256=$(cat ${work}/dump.sha256)"
aws --endpoint-url "$S3_ENDPOINT" s3 cp "${work}/dump.sha256" "s3://${S3_BUCKET}/${key}.sha256" --only-show-errors

if [ -n "${PUSHGATEWAY_URL:-}" ]; then
  printf 'backup_last_success_timestamp_seconds{kind="redis"} %s\n' "$(date -u +%s)" \
    | curl -fsS --data-binary @- "${PUSHGATEWAY_URL}/metrics/job/backup-redis" || true
fi

echo "[backup-redis] done: s3://${S3_BUCKET}/${key}"
