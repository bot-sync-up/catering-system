#!/usr/bin/env bash
# reset-db.sh — איפוס מסד הנתונים המקומי
set -euo pipefail

echo "[reset-db] מוריד DB ומוחק נפח..."
docker compose -f docker/docker-compose.yml down -v postgres
docker compose -f docker/docker-compose.yml up -d postgres
sleep 3
pnpm db:migrate
pnpm db:seed
echo "[reset-db] DB אופס בהצלחה"
