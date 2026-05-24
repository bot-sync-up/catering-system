#!/usr/bin/env bash
# Mandatory pre-deploy gate: backup, dry-run migrations, lock check, advisory lock.
set -Eeuo pipefail
ENV="${1:-staging}"

echo "[pre-deploy] env=$ENV"

# 1. Take a fresh backup tagged with deploy SHA
SHA=$(git rev-parse --short HEAD)
ENV_NAME="$ENV" \
  BACKUP_NAME_SUFFIX="-predeploy-$SHA" \
  bash "$(dirname "$0")/../backups/backup-postgres.sh"

# 2. Check for long-running transactions / locks
LOCKS=$(psql -tAc "SELECT count(*) FROM pg_stat_activity WHERE state != 'idle' AND now()-xact_start > interval '5 minutes'")
if [ "$LOCKS" -gt 0 ]; then
  echo "[pre-deploy] ABORT: $LOCKS long-running transactions detected"
  psql -c "SELECT pid, usename, age(clock_timestamp(), query_start), query FROM pg_stat_activity WHERE state != 'idle' ORDER BY 3 DESC LIMIT 5"
  exit 1
fi

# 3. Dry-run migrations against a shadow DB
SHADOW="appdb_shadow_$$"
createdb "$SHADOW"
trap 'dropdb --if-exists "$SHADOW" >/dev/null 2>&1 || true' EXIT
DATABASE_URL="${DATABASE_URL%/*}/$SHADOW" pnpm prisma migrate deploy --schema=prisma/schema.prisma

# 4. Acquire advisory lock so concurrent deploys are blocked
psql -c "SELECT pg_try_advisory_lock(742007)" | grep -q t || { echo "[pre-deploy] ABORT: another deploy holds the advisory lock"; exit 1; }

echo "[pre-deploy] OK"
