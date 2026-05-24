#!/usr/bin/env bash
# Verify latest backup by restoring to a throwaway container & sanity-checking
set -euo pipefail

R2_BUCKET="${R2_BUCKET:?}"
R2_ENDPOINT="${R2_ENDPOINT:?}"
DB_USER="${POSTGRES_USER:-appuser}"
DB_NAME="${POSTGRES_DB:-appdb}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"; docker rm -f pg-verify >/dev/null 2>&1 || true' EXIT

echo "[verify] fetching latest backup"
KEY="$(aws --endpoint-url "$R2_ENDPOINT" s3 ls "s3://${R2_BUCKET}/postgres/" --recursive \
        | sort | tail -1 | awk '{print $4}')"
[[ -n "$KEY" ]] || { echo "no backup"; exit 2; }

aws --endpoint-url "$R2_ENDPOINT" s3 cp "s3://${R2_BUCKET}/${KEY}" "${WORK_DIR}/backup.gpg"

echo "[verify] sha check"
EXPECTED="$(aws --endpoint-url "$R2_ENDPOINT" s3api head-object \
            --bucket "$R2_BUCKET" --key "$KEY" --query 'Metadata.sha256' --output text)"
ACTUAL="$(sha256sum "${WORK_DIR}/backup.gpg" | awk '{print $1}')"
[[ "$EXPECTED" == "$ACTUAL" ]] || { echo "CHECKSUM MISMATCH"; exit 3; }

echo "[verify] booting throwaway postgres"
docker run -d --name pg-verify \
  -e POSTGRES_PASSWORD=verify \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_DB="$DB_NAME" \
  postgres:16-alpine >/dev/null

# wait
for _ in $(seq 1 30); do
  if docker exec pg-verify pg_isready -U "$DB_USER" >/dev/null 2>&1; then break; fi
  sleep 2
done

echo "[verify] restoring"
gpg --batch --yes --decrypt "${WORK_DIR}/backup.gpg" \
  | zstd -d -c \
  | docker exec -i pg-verify pg_restore -U "$DB_USER" -d "$DB_NAME" --no-owner

echo "[verify] sanity queries"
TABLES="$(docker exec pg-verify psql -U "$DB_USER" -d "$DB_NAME" -tAc \
          "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
[[ "$TABLES" -gt 0 ]] || { echo "no tables restored"; exit 4; }
echo "[verify] OK — ${TABLES} tables restored from ${KEY}"
