#!/usr/bin/env bash
# Redis backup — BGSAVE → copy RDB → upload R2
set -euo pipefail

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/redis}"
REDIS_CONTAINER="${REDIS_CONTAINER:-app-redis}"
R2_BUCKET="${R2_BUCKET:?R2_BUCKET required}"
R2_ENDPOINT="${R2_ENDPOINT:?R2_ENDPOINT required}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

echo "[$(date -u +%FT%TZ)] triggering BGSAVE"
docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" BGSAVE

# Wait for save to complete
LAST="$(docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" LASTSAVE)"
for _ in $(seq 1 60); do
  sleep 5
  NEW="$(docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" LASTSAVE)"
  if [[ "$NEW" != "$LAST" ]]; then break; fi
done

FILE="${BACKUP_DIR}/redis-${TIMESTAMP}.rdb.zst"
docker cp "${REDIS_CONTAINER}:/data/dump.rdb" "${BACKUP_DIR}/dump.rdb"
zstd -T0 -19 --rm "${BACKUP_DIR}/dump.rdb" -o "$FILE"

SHA="$(sha256sum "$FILE" | awk '{print $1}')"
echo "[$(date -u +%FT%TZ)] redis backup: ${FILE} sha256=${SHA}"

aws --endpoint-url "$R2_ENDPOINT" s3 cp "$FILE" \
    "s3://${R2_BUCKET}/redis/$(date -u +%Y/%m)/$(basename "$FILE")" \
    --metadata "sha256=${SHA}"

find "$BACKUP_DIR" -type f -name "redis-*.rdb.zst" -mtime "+${RETENTION_DAYS}" -delete
