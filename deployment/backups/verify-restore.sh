#!/usr/bin/env bash
# Weekly verification: restore latest backup to an ephemeral container and run sanity SQL.
set -Eeuo pipefail

: "${LATEST_BACKUP_URL:?}"
SANDBOX="pg-verify-$(date +%s)"

docker run -d --name "$SANDBOX" -e POSTGRES_PASSWORD=verify postgres:16-alpine
trap 'docker rm -f "$SANDBOX" >/dev/null' EXIT
sleep 10

# Copy restore script + key into sandbox
docker exec -i "$SANDBOX" bash -c "apt update && apt install -y curl zstd age awscli >/dev/null"
docker cp ./restore.sh "$SANDBOX:/restore.sh"

docker exec \
  -e PGHOST=localhost -e PGUSER=postgres -e PGPASSWORD=verify \
  -e S3_ENDPOINT -e S3_ACCESS_KEY -e S3_SECRET_KEY -e BACKUP_AGE_IDENTITY=/age.key \
  "$SANDBOX" bash /restore.sh --backup "$LATEST_BACKUP_URL" --target-db verify

# Sanity checks
docker exec "$SANDBOX" psql -U postgres -d verify -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" \
  | awk '{ if ($1<5) { print "[verify] FAIL: too few tables"; exit 1 } else print "[verify] tables="$1 }'

docker exec "$SANDBOX" psql -U postgres -d verify -tAc "SELECT max(created_at) FROM orders" || true

echo "[verify] backup OK"
