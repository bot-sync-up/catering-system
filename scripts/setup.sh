#!/usr/bin/env bash
# התקנה ראשונית של סביבת הפיתוח
set -euo pipefail

echo "==> בודק Node.js 22+"
node --version

echo "==> מפעיל corepack ו-pnpm"
corepack enable
corepack prepare pnpm@9.12.0 --activate

echo "==> מתקין תלויות"
pnpm install

echo "==> מעתיק .env.example ל-.env (אם לא קיים)"
[ -f .env ] || cp .env.example .env

echo "==> מעלה Postgres ו-Redis ב-Docker"
docker compose up -d postgres redis

echo "==> מוכן! הריצו: pnpm dev"
