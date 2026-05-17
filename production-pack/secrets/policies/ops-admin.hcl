# Ops admins — wide but audited access. Use sudo-style break-glass tokens; do NOT issue long-lived.
path "secret/*"   { capabilities = ["create", "read", "update", "delete", "list"] }
path "sys/policies/acl/*" { capabilities = ["create", "read", "update", "delete", "list"] }
path "sys/auth/*" { capabilities = ["create", "read", "update", "delete", "list", "sudo"] }
path "auth/*"     { capabilities = ["create", "read", "update", "delete", "list"] }
path "transit/keys/*" { capabilities = ["create", "read", "update", "delete", "list"] }
path "transit/keys/+/rotate" { capabilities = ["update"] }
path "database/config/*" { capabilities = ["create", "read", "update", "delete", "list"] }
path "database/roles/*"  { capabilities = ["create", "read", "update", "delete", "list"] }
path "sys/audit/*"       { capabilities = ["create", "read", "update", "delete", "list", "sudo"] }
