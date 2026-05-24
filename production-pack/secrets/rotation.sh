#!/usr/bin/env bash
# rotation.sh — rotate JWT signing keys, AES encryption keys, and partner API keys.
#
# Strategy:
#   - keys are versioned in Vault (transit + KV-v2)
#   - rotation writes a NEW version; old versions stay valid for the grace period
#   - apps read all versions; encrypt with the latest, decrypt by version
#   - downstream services pick up changes via the Vault Agent / External Secrets refresh
#
# Usage:
#   ./rotation.sh jwt
#   ./rotation.sh aes
#   ./rotation.sh api-keys
#   ./rotation.sh all
set -euo pipefail
: "${VAULT_ADDR:?}"; : "${VAULT_TOKEN:?}"

log() { printf '[rotate %s] %s\n' "$(date -u +%FT%TZ)" "$*"; }

rotate_jwt() {
  log "rotating JWT signing key (RSA-2048)"
  vault write -f transit/keys/jwt-signing/rotate
  current=$(vault read -field=latest_version transit/keys/jwt-signing)
  vault write transit/keys/jwt-signing/config min_decryption_version="$((current - 2 > 0 ? current - 2 : 1))"
  log "jwt -> version $current"
}

rotate_aes() {
  log "rotating AES-256 data key"
  vault write -f transit/keys/app-aes/rotate
  current=$(vault read -field=latest_version transit/keys/app-aes)
  # keep 3 versions for at-rest decryption of older rows
  vault write transit/keys/app-aes/config min_decryption_version="$((current - 2 > 0 ? current - 2 : 1))"
  log "aes -> version $current"
}

rotate_api_keys() {
  log "rotating partner API keys"
  for key in stripe twilio openai sendgrid; do
    new=$(openssl rand -hex 32)
    vault kv patch -mount=secret "app/production/api-keys" "${key}_pending=${new}"
    log "  $key: pending value written. Confirm with provider, then promote:"
    log "  vault kv patch -mount=secret app/production/api-keys ${key}=\$pending && vault kv patch ${key}_pending=''"
  done
}

case "${1:-all}" in
  jwt)      rotate_jwt ;;
  aes)      rotate_aes ;;
  api-keys) rotate_api_keys ;;
  all)      rotate_jwt; rotate_aes; rotate_api_keys ;;
  *) echo "usage: $0 {jwt|aes|api-keys|all}"; exit 1;;
esac

# Trigger a rollout so pods pick up new env via projected secret
if command -v kubectl >/dev/null; then
  kubectl -n production rollout restart deploy/app-next deploy/app-gateway deploy/app-worker
fi
log "done"
