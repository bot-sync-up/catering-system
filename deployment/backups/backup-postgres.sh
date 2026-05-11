#!/usr/bin/env bash
# Encrypted, compressed daily Postgres backup -> S3/R2.
# Retention is enforced server-side by bucket lifecycle rules.
set -Eeuo pipefail
IFS=$'\n\t'

# --- Required env -----------------------------------------------------
: "${PGHOST:?}"; : "${PGUSER:?}"; : "${PGPASSWORD:?}"; : "${PGDATABASE:?}"
: "${S3_BUCKET:?}"; : "${S3_ENDPOINT:?}"; : "${S3_ACCESS_KEY:?}"; : "${S3_SECRET_KEY:?}"
: "${BACKUP_AGE_RECIPIENT:?}"        # age public key for encryption
ENV_NAME="${ENV_NAME:-prod}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

TS=$(date -u +%Y%m%dT%H%M%SZ)
NAME="${ENV_NAME}-${PGDATABASE}-${TS}.sql.zst.age"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

notify() {
  [ -n "$SLACK_WEBHOOK" ] || return 0
  curl -sS -X POST "$SLACK_WEBHOOK" -H 'Content-Type: application/json' \
    -d "{\"text\":\":floppy_disk: backup $1: \`$NAME\`\"}" >/dev/null || true
}

echo "[backup] pg_dump -> compress -> encrypt -> upload"
pg_dump --format=custom --compress=0 --no-owner --no-privileges \
        --serializable-deferrable --jobs=4 --file="$WORK/dump.pgc"

zstd --long=27 -19 -T0 -q -f "$WORK/dump.pgc" -o "$WORK/dump.pgc.zst"
age -r "$BACKUP_AGE_RECIPIENT" -o "$WORK/$NAME" "$WORK/dump.pgc.zst"

# Upload with checksums + storage-class
AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" \
AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
aws --endpoint-url "$S3_ENDPOINT" s3 cp "$WORK/$NAME" \
  "s3://$S3_BUCKET/$ENV_NAME/daily/$NAME" \
  --storage-class STANDARD_IA \
  --metadata "sha256=$(sha256sum "$WORK/$NAME" | awk '{print $1}')"

# Weekly + monthly copy (server-side, no re-upload)
DOW=$(date -u +%u)   # Monday=1
DOM=$(date -u +%d)
if [ "$DOW" = "7" ]; then
  AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
    aws --endpoint-url "$S3_ENDPOINT" s3 cp \
      "s3://$S3_BUCKET/$ENV_NAME/daily/$NAME" \
      "s3://$S3_BUCKET/$ENV_NAME/weekly/$NAME"
fi
if [ "$DOM" = "01" ]; then
  AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
    aws --endpoint-url "$S3_ENDPOINT" s3 cp \
      "s3://$S3_BUCKET/$ENV_NAME/daily/$NAME" \
      "s3://$S3_BUCKET/$ENV_NAME/monthly/$NAME" \
      --storage-class GLACIER
fi

echo "[backup] done: $NAME"
notify "OK"
