# HashiCorp Vault policies for application secrets
# Apply with: vault policy write <name> <file>

# ------- app-read: runtime services read their secrets -------
path "secret/data/app/prod/*" {
  capabilities = ["read", "list"]
}
path "secret/data/app/staging/*" {
  capabilities = ["read", "list"]
}
path "database/creds/app-readonly" {
  capabilities = ["read"]
}
path "database/creds/app-readwrite" {
  capabilities = ["read"]
}

# ------- ci-write: CI rotates non-prod secrets only -------
path "secret/data/app/staging/*" {
  capabilities = ["create", "update", "read"]
}
path "secret/data/app/prod/*" {
  capabilities = ["deny"]
}

# ------- admin: humans (PR-reviewed) manage prod secrets -------
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
path "sys/policies/acl/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
path "auth/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# ------- rotation-bot: only the rotation script -------
path "secret/data/app/prod/db-password" {
  capabilities = ["read", "update"]
}
path "secret/data/app/prod/jwt-secret" {
  capabilities = ["read", "update"]
}
path "secret/data/app/prod/redis-password" {
  capabilities = ["read", "update"]
}
path "secret/metadata/app/prod/*" {
  capabilities = ["list", "read"]
}
