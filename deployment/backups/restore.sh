#!/usr/bin/env bash
# Postgres restore with PITR support
# Usage:
#   restore.sh latest                       — restore most recent dump
#   restore.sh file <path-or-r2-key>        — restore specific dump
#   restore.sh pitr <YYYY-MM-DDTHH:MM:SSZ>  — point-in-time restore (requires WAL archive)
set -euo pipefail

MODE="${1:?usage: restore.sh latest|file|pitr ...}"
PG_CONTAINER="${PG_CONTAINER:-app-postgres}"
DB_NAME="${POSTGRES_DB:-appdb}"
DB_USER="${POSTGRES_USER:-appuser}"
R2_BUCKET="${R2_BUCKET:?R2_BUCKET required}"
R2_ENDPOINT="${R2_ENDPOINT:?R2_ENDPOINT required}"
RESTORE_DIR="${RESTORE_DIR:-/var/restore}"
mkdir -p "$RESTORE_DIR"

confirm() {
  read -r -p "RESTORE will OVERWRITE database '${DB_NAME}'. Type the DB name to confirm: " ans
  [[ "$ans" == "$DB_NAME" ]] || { echo "aborted"; exit 1; }
}

fetch_remote() {
  local key="$1" dest="$2"
  aws --endpoint-url "$R2_ENDPOINT" s3 cp "s3://${R2_BUCKET}/${key}" "$dest"
}

decrypt_and_pipe() {
  local file="$1"
  gpg --batch --yes --decrypt "$file" | zstd -d -c
}

case "$MODE" in
  latest)
    confirm
    KEY="$(aws --endpoint-url "$R2_ENDPOINT" s3 ls "s3://${R2_BUCKET}/postgres/" --recursive \
            | sort | tail -1 | awk '{print $4}')"
    [[ -n "$KEY" ]] || { echo "no backup found"; exit 2; }
    FILE="${RESTORE_DIR}/$(basename "$KEY")"
    fetch_remote "$KEY" "$FILE"
    decrypt_and_pipe "$FILE" | docker exec -i "$PG_CONTAINER" \
      pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner
    ;;

  file)
    confirm
    SRC="${2:?file path or R2 key required}"
    if [[ -f "$SRC" ]]; then
      FILE="$SRC"
    else
      FILE="${RESTORE_DIR}/$(basename "$SRC")"
      fetch_remote "$SRC" "$FILE"
    fi
    decrypt_and_pipe "$FILE" | docker exec -i "$PG_CONTAINER" \
      pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner
    ;;

  pitr)
    confirm
    TARGET_TIME="${2:?target time required (ISO 8601)}"
    echo "Stopping postgres for PITR..."
    docker compose stop postgres
    docker run --rm -v app_postgres-data:/var/lib/postgresql/data alpine \
      sh -c "rm -rf /var/lib/postgresql/data/*"
    # base backup restore (assumes base.tar in R2)
    aws --endpoint-url "$R2_ENDPOINT" s3 cp \
      "s3://${R2_BUCKET}/postgres/base/latest.tar.zst" - \
      | zstd -d \
      | docker run --rm -i -v app_postgres-data:/var/lib/postgresql/data alpine \
          tar -x -C /var/lib/postgresql/data
    # recovery.signal + restore_command
    docker run --rm -v app_postgres-data:/var/lib/postgresql/data alpine sh -c "
      touch /var/lib/postgresql/data/recovery.signal
      cat >> /var/lib/postgresql/data/postgresql.auto.conf <<EOF
recovery_target_time = '${TARGET_TIME}'
restore_command = 'aws --endpoint-url ${R2_ENDPOINT} s3 cp s3://${R2_BUCKET}/postgres/wal/%f %p'
EOF"
    docker compose up -d postgres
    echo "PITR initiated. Monitor logs until recovery completes."
    ;;

  *)
    echo "Unknown mode: $MODE" >&2
    exit 1
    ;;
esac

echo "Restore done."
