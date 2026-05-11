ui            = true
disable_mlock = false
api_addr      = "https://vault.example.com:8200"
cluster_addr  = "https://vault.example.com:8201"

storage "raft" {
  path    = "/vault/data"
  node_id = "vault-1"
  retry_join { leader_api_addr = "https://vault-1.example.com:8200" }
  retry_join { leader_api_addr = "https://vault-2.example.com:8200" }
  retry_join { leader_api_addr = "https://vault-3.example.com:8200" }
}

listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_cert_file = "/vault/tls/server.crt"
  tls_key_file  = "/vault/tls/server.key"
  tls_min_version = "tls12"
}

# Auto-unseal with cloud KMS — pick one and remove the others.
seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "alias/vault-unseal"
}
# seal "gcpckms" { project = "..."; region = "global"; key_ring = "vault"; crypto_key = "unseal" }
# seal "azurekeyvault" { tenant_id="..."; vault_name="..."; key_name="vault-unseal" }

telemetry {
  prometheus_retention_time = "30m"
  disable_hostname          = true
}

audit_device "file" {
  type = "file"
  options { file_path = "/vault/audit/audit.log" }
}
