#!/usr/bin/env bash
# restore.sh — Point-In-Time Recovery from a base dump + optional WAL replay.
#
# Modes:
#   ./restore.sh full     <s3_key>                       # restore one dump (overwrites target DB)
#   ./restore.sh pitr     <s3_key> "<recovery_target_time>"  # restore + replay WAL to target time
#
# Required env: same as backup-postgres.sh + BACKUP_AGE_IDENTITY (path to age identity file)
set -euo pipefail

: "${POSTGRES_HOST:?required}"
: "${POSTGRES_DB:?required}"
: "${POSTGRES_USER:?required}"
: "${POSTGRES_PASSWORD:?required}"
: "${S3_ENDPOINT:?required}"
: "${S3_BUCKET:?required}"
: "${BACKUP_AGE_IDENTITY:?required}"

mode="${1:?usage: restore.sh full|pitr <key> [recovery_target_time]}"
key="${2:?missing s3 key}"
target_time="${3:-}"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

echo "[restore] downloading s3://${S3_BUCKET}/${key}"
aws --endpoint-url "$S3_ENDPOINT" s3 cp "s3://${S3_BUCKET}/${key}" "${work}/dump.age" --only-show-errors
aws --endpoint-url "$S3_ENDPOINT" s3 cp "s3://${S3_BUCKET}/${key}.sha256" "${work}/dump.sha256" --only-show-errors || true

age -d -i "$BACKUP_AGE_IDENTITY" -o "${work}/dump.pgc" "${work}/dump.age"

if [ -f "${work}/dump.sha256" ]; then
  expected=$(cat "${work}/dump.sha256")
  actual=$(sha256sum "${work}/dump.pgc" | awk '{print $1}')
  if [ "$expected" != "$actual" ]; then
    echo "[restore] sha256 mismatch (expected=$expected actual=$actual)"; exit 2
  fi
fi

export PGPASSWORD="$POSTGRES_PASSWORD"

case "$mode" in
  full)
    echo "[restore] full restore to ${POSTGRES_DB}"
    psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c \
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${POSTGRES_DB}' AND pid<>pg_backend_pid();" || true
    psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c \
      "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
    psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c \
      "CREATE DATABASE ${POSTGRES_DB};"
    pg_restore --host="$POSTGRES_HOST" --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" \
      --jobs=4 --no-owner --no-privileges --exit-on-error "${work}/dump.pgc"
    echo "[restore] full restore complete"
    ;;
  pitr)
    : "${WAL_S3_PREFIX:?required for PITR}"
    [ -n "$target_time" ] || { echo "PITR requires recovery_target_time"; exit 1; }
    echo "[restore] PITR target=${target_time}"
    # 1. Stop Postgres, blank data dir (BE SURE — this is destructive)
    echo "WARN: this assumes you are running on a standby server. Aborting if PGDATA not set."
    : "${PGDATA:?PGDATA must point to a clean cluster}"
    pg_ctl -D "$PGDATA" stop -m fast || true
    rm -rf "${PGDATA:?}"/*
    pg_basebackup -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -D "$PGDATA" -Fp -Xs -P
    cat > "$PGDATA/postgresql.auto.conf" <<EOF
restore_command = 'aws --endpoint-url ${S3_ENDPOINT} s3 cp s3://${S3_BUCKET}/${WAL_S3_PREFIX}/%f /tmp/%f && mv /tmp/%f %p'
recovery_target_time = '${target_time}'
recovery_target_action = 'promote'
EOF
    touch "$PGDATA/recovery.signal"
    pg_ctl -D "$PGDATA" start
    echo "[restore] PITR initiated; watch logs for 'recovery stopping before target'"
    ;;
  *) echo "unknown mode: $mode"; exit 1;;
esac
