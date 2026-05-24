#!/usr/bin/env bash
# Restore Postgres with optional Point-In-Time Recovery using WAL.
# Usage:
#   ./restore.sh --backup s3://.../daily/prod-appdb-20251101T030000Z.sql.zst.age
#   ./restore.sh --backup s3://... --target-time "2025-11-01 04:35:00 UTC"
set -Eeuo pipefail

BACKUP=""
TARGET_TIME=""
TARGET_DB="${PGDATABASE:-appdb_restore}"
while [ $# -gt 0 ]; do
  case "$1" in
    --backup) BACKUP="$2"; shift 2 ;;
    --target-time) TARGET_TIME="$2"; shift 2 ;;
    --target-db)   TARGET_DB="$2";   shift 2 ;;
    *) echo "unknown flag $1"; exit 2 ;;
  esac
done
[ -n "$BACKUP" ] || { echo "missing --backup"; exit 2; }

: "${PGHOST:?}"; : "${PGUSER:?}"; : "${PGPASSWORD:?}"
: "${S3_ENDPOINT:?}"; : "${S3_ACCESS_KEY:?}"; : "${S3_SECRET_KEY:?}"
: "${BACKUP_AGE_IDENTITY:?}"   # path to age identity file

WORK=$(mktemp -d); trap 'rm -rf "$WORK"' EXIT

echo "[restore] downloading $BACKUP"
AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
  aws --endpoint-url "$S3_ENDPOINT" s3 cp "$BACKUP" "$WORK/dump.age"

echo "[restore] decrypt + decompress"
age -d -i "$BACKUP_AGE_IDENTITY" -o "$WORK/dump.zst" "$WORK/dump.age"
zstd -d -q -f "$WORK/dump.zst" -o "$WORK/dump.pgc"

echo "[restore] creating target DB: $TARGET_DB"
createdb "$TARGET_DB"
pg_restore --jobs=4 --no-owner --no-privileges --dbname="$TARGET_DB" "$WORK/dump.pgc"

if [ -n "$TARGET_TIME" ]; then
  echo "[restore] applying WAL up to $TARGET_TIME"
  # Requires WAL archive accessible via $WAL_ARCHIVE
  : "${WAL_ARCHIVE:?}"
  pg_ctl -D "$PGDATA" stop -m fast
  cat > "$PGDATA/recovery.signal" <<EOF
restore_command = 'cp $WAL_ARCHIVE/%f %p'
recovery_target_time = '$TARGET_TIME'
recovery_target_action = 'promote'
EOF
  pg_ctl -D "$PGDATA" start
fi

echo "[restore] OK"
