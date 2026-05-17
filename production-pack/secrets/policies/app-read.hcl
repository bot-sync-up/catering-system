# Read-only access for runtime services to their secret bundle.
path "secret/data/app/{{identity.entity.aliases.auth_kubernetes_*.metadata.service_account_namespace}}/*" {
  capabilities = ["read"]
}
path "database/creds/app-readwrite" {
  capabilities = ["read"]
}
path "transit/encrypt/app" {
  capabilities = ["update"]
}
path "transit/decrypt/app" {
  capabilities = ["update"]
}
