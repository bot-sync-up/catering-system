#!/usr/bin/env bash
# Rotate critical secrets in Vault, then trigger app reload
set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:?}"
VAULT_TOKEN="${VAULT_TOKEN:?}"
ENV_NAME="${1:-prod}"

rand() { openssl rand -base64 48 | tr -d '=+/' | head -c 48; }

rotate() {
  local key="$1"
  local new_val
  new_val="$(rand)"
  echo "[rotation] rotating ${key}"
  vault kv put -mount=secret "app/${ENV_NAME}/${key}" value="$new_val"
}

rotate "jwt-secret"
rotate "session-secret"
rotate "webhook-signing-key"

# DB password rotation needs coordination: store new, update DB, restart pods
NEW_DB_PASS="$(rand)"
OLD_DB_PASS="$(vault kv get -mount=secret -field=value "app/${ENV_NAME}/db-password")"

echo "[rotation] updating db password in postgres"
docker exec -e PGPASSWORD="$OLD_DB_PASS" app-postgres \
  psql -U appuser -d appdb -c "ALTER USER appuser WITH PASSWORD '${NEW_DB_PASS}';"

vault kv put -mount=secret "app/${ENV_NAME}/db-password" value="$NEW_DB_PASS"

echo "[rotation] triggering app reload"
docker compose -f /opt/app/deployment/docker/docker-compose.yml \
               -f /opt/app/deployment/docker/docker-compose.prod.yml \
               kill -s SIGHUP gateway worker next

echo "[rotation] complete"
