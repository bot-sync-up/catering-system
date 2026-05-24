###############################################################################
# Managed Postgres - staging
#
# בברירת מחדל נשתמש ב-Neon (postgres serverless) כיוון שיש לו חינם generous,
# אבל מסופקות גם אפשרויות AWS RDS / DigitalOcean / Hetzner.
###############################################################################

###############################################################################
# DigitalOcean Managed Postgres
###############################################################################

resource "digitalocean_database_cluster" "postgres" {
  count      = var.postgres_provider == "digitalocean" ? 1 : 0
  name       = "${local.name}-pg"
  engine     = "pg"
  version    = var.postgres_version
  size       = var.do_postgres_size
  region     = var.do_region
  node_count = 1
  tags       = ["staging", var.project_name]
}

resource "digitalocean_database_db" "app" {
  count      = var.postgres_provider == "digitalocean" ? 1 : 0
  cluster_id = digitalocean_database_cluster.postgres[0].id
  name       = "app_staging"
}

resource "digitalocean_database_user" "app" {
  count      = var.postgres_provider == "digitalocean" ? 1 : 0
  cluster_id = digitalocean_database_cluster.postgres[0].id
  name       = "app_staging"
}

resource "digitalocean_database_firewall" "postgres" {
  count      = var.postgres_provider == "digitalocean" ? 1 : 0
  cluster_id = digitalocean_database_cluster.postgres[0].id

  dynamic "rule" {
    for_each = local.app_ipv4
    content {
      type  = "ip_addr"
      value = rule.value
    }
  }
}

###############################################################################
# Neon (Postgres serverless) - דרך REST API
# מימוש מינימלי דרך null_resource + curl. החלפה ל-provider רשמי כשיהיה זמין.
###############################################################################

resource "random_password" "neon_admin" {
  count   = var.postgres_provider == "neon" ? 1 : 0
  length  = 32
  special = true
}

resource "null_resource" "neon_project" {
  count = var.postgres_provider == "neon" ? 1 : 0

  triggers = {
    project_name = local.name
    pg_version   = var.postgres_version
  }

  provisioner "local-exec" {
    when    = create
    command = <<-EOT
      curl -fsSL -X POST https://console.neon.tech/api/v2/projects \
        -H "Authorization: Bearer ${var.neon_api_key}" \
        -H "Content-Type: application/json" \
        -d '{
          "project": {
            "name": "${local.name}",
            "pg_version": ${var.postgres_version},
            "region_id": "${var.neon_region}"
          }
        }'
    EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = "echo 'מחיקה ידנית מ-Neon console'"
  }
}

###############################################################################
# Self-hosted Postgres על אחד מה-VPS (fallback לפיתוח)
###############################################################################

resource "hcloud_volume" "postgres_data" {
  count             = var.postgres_provider == "self_hosted" && var.cloud_provider == "hetzner" ? 1 : 0
  name              = "${local.name}-pg-data"
  size              = var.postgres_volume_size
  location          = var.hcloud_location
  format            = "ext4"
  automount         = true
  server_id         = hcloud_server.app[0].id
  delete_protection = false
  labels            = local.hcloud_labels
}

###############################################################################
# חיבור מאוחד (Connection string output)
###############################################################################

locals {
  postgres_connection_string = (
    var.postgres_provider == "digitalocean" ?
      "postgres://${digitalocean_database_user.app[0].name}:${digitalocean_database_user.app[0].password}@${digitalocean_database_cluster.postgres[0].private_host}:${digitalocean_database_cluster.postgres[0].port}/${digitalocean_database_db.app[0].name}?sslmode=require" :
    var.postgres_provider == "neon" ?
      "postgres://app_staging:${random_password.neon_admin[0].result}@SET_FROM_NEON_CONSOLE/${local.name}?sslmode=require" :
    var.postgres_provider == "self_hosted" ?
      "postgres://app_staging:SECRET_FROM_VAULT@${try(local.app_ipv4[0], "127.0.0.1")}:5432/app_staging?sslmode=disable" :
      "postgres://SET_MANUALLY"
  )
}
