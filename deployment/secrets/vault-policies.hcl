# --- platform-read: app read-only access to its own secrets ---
path "platform/data/*" {
  capabilities = ["read", "list"]
}
path "platform/metadata/*" {
  capabilities = ["list", "read"]
}

# --- platform-rotate: rotation job ---
path "platform/data/auth/*"   { capabilities = ["read","create","update"] }
path "platform/data/payments/*" { capabilities = ["read","create","update"] }

# --- ops-admin: full admin (break-glass, MFA required) ---
path "sys/*"             { capabilities = ["create","read","update","delete","list","sudo"] }
path "platform/*"        { capabilities = ["create","read","update","delete","list"] }

# --- ci-cd: pulls deploy keys for GitHub Actions ---
path "platform/data/ci/*" {
  capabilities = ["read"]
}
