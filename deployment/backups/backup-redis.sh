#!/usr/bin/env bash
# Redis RDB snapshot -> encrypted upload.
set -Eeuo pipefail

: "${REDIS_HOST:=redis}"
: "${REDIS_PORT:=6379}"
: "${REDIS_PASSWORD:?}"
: "${S3_BUCKET:?}"; : "${S3_ENDPOINT:?}"; : "${S3_ACCESS_KEY:?}"; : "${S3_SECRET_KEY:?}"
: "${BACKUP_AGE_RECIPIENT:?}"
ENV_NAME="${ENV_NAME:-prod}"

TS=$(date -u +%Y%m%dT%H%M%SZ)
NAME="redis-${ENV_NAME}-${TS}.rdb.zst.age"
WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT

# Trigger BGSAVE, wait for completion
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE
LAST=0
while :; do
  CUR=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)
  [ "$CUR" != "$LAST" ] && [ "$LAST" -ne 0 ] && break
  LAST=$CUR
  sleep 2
done

# Copy RDB file (assumes /data shared volume; if remote, use --rdb)
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --rdb "$WORK/dump.rdb"

zstd -19 -T0 -q -f "$WORK/dump.rdb" -o "$WORK/dump.rdb.zst"
age -r "$BACKUP_AGE_RECIPIENT" -o "$WORK/$NAME" "$WORK/dump.rdb.zst"

AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
  aws --endpoint-url "$S3_ENDPOINT" s3 cp "$WORK/$NAME" \
    "s3://$S3_BUCKET/$ENV_NAME/redis/$NAME"

echo "[redis-backup] uploaded $NAME"
