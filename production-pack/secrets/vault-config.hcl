ui = true
cluster_name = "app-vault"
disable_mlock = false

storage "raft" {
  path = "/vault/data"
  node_id = "vault-1"
}

listener "tcp" {
  address       = "0.0.0.0:8200"
  cluster_address = "0.0.0.0:8201"
  tls_cert_file = "/vault/certs/server.crt"
  tls_key_file  = "/vault/certs/server.key"
  tls_min_version = "tls12"
}

api_addr     = "https://vault.internal:8200"
cluster_addr = "https://vault.internal:8201"

# Auto-unseal via cloud KMS — replace with your provider
seal "transit" {
  address      = "https://unseal-vault.internal:8200"
  token        = ""  # injected via env VAULT_TOKEN
  disable_renewal = "false"
  key_name     = "autounseal"
  mount_path   = "transit/"
}

telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = true
}
