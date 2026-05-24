#!/usr/bin/env bash
# bootstrap.sh — אתחול ראשוני של סביבת הפיתוח
set -euo pipefail

echo "[bootstrap] בודק דרישות..."
command -v node >/dev/null || { echo "node 22+ נדרש"; exit 1; }
command -v pnpm >/dev/null || { echo "pnpm 9+ נדרש"; exit 1; }
command -v docker >/dev/null || { echo "docker נדרש"; exit 1; }

if [ ! -f .env ]; then
  echo "[bootstrap] יוצר .env מתוך .env.example..."
  cp .env.example .env
fi

echo "[bootstrap] מתקין dependencies..."
pnpm install

echo "[bootstrap] מעלה Postgres + Redis..."
docker compose -f docker/docker-compose.yml up -d postgres redis

echo "[bootstrap] מריץ migrations..."
pnpm db:migrate || echo "(אין migrations עדיין)"

echo "[bootstrap] מוכן. הפעל: pnpm dev"
