###############################################################################
# Managed Redis - staging
#
# תומכים: Upstash (ברירת מחדל - REST + serverless), Redis Cloud / Redis Labs,
# DigitalOcean Managed Redis.
###############################################################################

###############################################################################
# Upstash Redis (ברירת מחדל ל-staging)
###############################################################################

provider "upstash" {
  email   = var.upstash_email
  api_key = var.upstash_api_key
}

terraform {
  required_providers {
    upstash = {
      source  = "upstash/upstash"
      version = "~> 1.5"
    }
  }
}

resource "upstash_redis_database" "staging" {
  count        = var.redis_provider == "upstash" ? 1 : 0
  database_name = "${local.name}-redis"
  region       = var.upstash_region
  tls          = true
  multizone    = false
  eviction     = true
}

###############################################################################
# DigitalOcean Managed Redis
###############################################################################

resource "digitalocean_database_cluster" "redis" {
  count      = var.redis_provider == "digitalocean" ? 1 : 0
  name       = "${local.name}-redis"
  engine     = "redis"
  version    = var.redis_version
  size       = var.do_redis_size
  region     = var.do_region
  node_count = 1
  tags       = ["staging", var.project_name]
}

resource "digitalocean_database_firewall" "redis" {
  count      = var.redis_provider == "digitalocean" ? 1 : 0
  cluster_id = digitalocean_database_cluster.redis[0].id

  dynamic "rule" {
    for_each = local.app_ipv4
    content {
      type  = "ip_addr"
      value = rule.value
    }
  }
}

###############################################################################
# Redis Cloud (Redis Labs) - stub דרך null_resource
###############################################################################

resource "null_resource" "redis_cloud" {
  count = var.redis_provider == "redis_cloud" ? 1 : 0

  triggers = {
    subscription_name = local.name
  }

  provisioner "local-exec" {
    when    = create
    command = <<-EOT
      echo "החלף בקריאה ל-Redis Cloud API באמצעות var.redis_cloud_api_key"
      echo "https://docs.redis.com/latest/rc/api/"
    EOT
  }
}

###############################################################################
# חיבור מאוחד
###############################################################################

locals {
  redis_connection_string = (
    var.redis_provider == "upstash" ?
      "rediss://default:${try(upstash_redis_database.staging[0].password, "SET")}@${try(upstash_redis_database.staging[0].endpoint, "SET")}:${try(upstash_redis_database.staging[0].port, 6379)}" :
    var.redis_provider == "digitalocean" ?
      "rediss://default:${try(digitalocean_database_cluster.redis[0].password, "SET")}@${try(digitalocean_database_cluster.redis[0].private_host, "SET")}:${try(digitalocean_database_cluster.redis[0].port, 25061)}" :
      "redis://SET_MANUALLY"
  )
}
