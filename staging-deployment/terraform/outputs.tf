###############################################################################
# Outputs - staging
###############################################################################

output "app_servers_ipv4" {
  description = "כתובות IPv4 של מכונות האפליקציה"
  value       = local.app_ipv4
}

output "app_servers_ipv6" {
  description = "כתובות IPv6 של מכונות האפליקציה"
  value       = local.app_ipv6
}

output "ansible_inventory" {
  description = "תוכן inventory ל-Ansible (כתוב לקובץ inventory.staging)"
  value = templatefile("${path.module}/templates/inventory.tpl", {
    hosts      = local.app_ipv4
    admin_user = var.admin_user
  })
}

output "postgres_connection_string" {
  description = "מחרוזת חיבור Postgres - SENSITIVE"
  value       = local.postgres_connection_string
  sensitive   = true
}

output "redis_connection_string" {
  description = "מחרוזת חיבור Redis - SENSITIVE"
  value       = local.redis_connection_string
  sensitive   = true
}

output "r2_buckets" {
  description = "שמות buckets ב-R2"
  value = {
    uploads = cloudflare_r2_bucket.uploads.name
    backups = cloudflare_r2_bucket.backups.name
    media   = cloudflare_r2_bucket.media.name
  }
}

output "r2_api_token" {
  description = "API token ל-R2 - SENSITIVE"
  value       = cloudflare_api_token.r2_app.value
  sensitive   = true
}

output "dns_records" {
  description = "רשומות ה-DNS שנוצרו"
  value       = [for k, v in local.staging_subdomains : "${k}.${var.project_name}.co.il -> ${v.value}"]
}

output "summary" {
  description = "סיכום סביבת staging"
  value = {
    project       = var.project_name
    environment   = "staging"
    cloud         = var.cloud_provider
    postgres      = var.postgres_provider
    redis         = var.redis_provider
    app_node_count = var.app_node_count
    primary_ip    = try(local.app_ipv4[0], "not-provisioned")
  }
}
