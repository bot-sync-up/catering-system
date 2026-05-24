#!/usr/bin/env bash
# Postgres backup → encrypted dump → upload to Cloudflare R2
# Usage: backup-postgres.sh [tag]   (tag defaults to "scheduled")
set -euo pipefail

TAG="${1:-scheduled}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgres}"
PG_CONTAINER="${PG_CONTAINER:-app-postgres}"
DB_NAME="${POSTGRES_DB:-appdb}"
DB_USER="${POSTGRES_USER:-appuser}"
R2_BUCKET="${R2_BUCKET:?R2_BUCKET required}"
R2_ENDPOINT="${R2_ENDPOINT:?R2_ENDPOINT required}"
GPG_RECIPIENT="${BACKUP_GPG_RECIPIENT:?BACKUP_GPG_RECIPIENT required}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
FILE="${BACKUP_DIR}/pg-${DB_NAME}-${TAG}-${TIMESTAMP}.sql.zst.gpg"

echo "[$(date -u +%FT%TZ)] starting backup → ${FILE}"

# Stream: pg_dump → zstd → gpg → file
docker exec -i "$PG_CONTAINER" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" \
    --format=custom --no-owner --no-privileges --compress=0 --verbose \
  | zstd -T0 -19 \
  | gpg --batch --yes --trust-model always \
        --encrypt --recipient "$GPG_RECIPIENT" \
        --output "$FILE"

SIZE="$(stat -c%s "$FILE")"
SHA="$(sha256sum "$FILE" | awk '{print $1}')"

echo "[$(date -u +%FT%TZ)] dump complete: size=${SIZE} sha256=${SHA}"

# Upload to R2 (using aws CLI configured for R2)
aws --endpoint-url "$R2_ENDPOINT" s3 cp "$FILE" \
    "s3://${R2_BUCKET}/postgres/$(date -u +%Y/%m)/$(basename "$FILE")" \
    --metadata "sha256=${SHA},tag=${TAG}"

# Local retention
find "$BACKUP_DIR" -type f -name "pg-*.gpg" -mtime "+${RETENTION_DAYS}" -delete

# Remote retention (lifecycle policy preferred; this is a guardrail)
aws --endpoint-url "$R2_ENDPOINT" s3 ls "s3://${R2_BUCKET}/postgres/" --recursive \
  | awk -v cutoff="$(date -u -d "${RETENTION_DAYS} days ago" +%Y-%m-%d)" '$1 < cutoff {print $4}' \
  | while read -r key; do
      aws --endpoint-url "$R2_ENDPOINT" s3 rm "s3://${R2_BUCKET}/${key}"
    done

echo "[$(date -u +%FT%TZ)] backup uploaded & rotated"
