###############################################################################
# Cloudflare DNS records - staging subdomains
###############################################################################

locals {
  staging_subdomains = {
    "staging"          = { value = try(local.app_ipv4[0], "0.0.0.0"), type = "A", proxied = true }
    "api.staging"      = { value = try(local.app_ipv4[0], "0.0.0.0"), type = "A", proxied = true }
    "portal.staging"   = { value = try(local.app_ipv4[0], "0.0.0.0"), type = "A", proxied = true }
    "admin.staging"    = { value = try(local.app_ipv4[0], "0.0.0.0"), type = "A", proxied = true }
    "ws.staging"       = { value = try(local.app_ipv4[0], "0.0.0.0"), type = "A", proxied = false } # websockets - bypass proxy
    "grafana.staging"  = { value = try(local.app_ipv4[0], "0.0.0.0"), type = "A", proxied = true }
    "metrics.staging"  = { value = try(local.app_ipv4[0], "0.0.0.0"), type = "A", proxied = false } # prometheus scrape
  }
}

resource "cloudflare_record" "staging" {
  for_each = local.staging_subdomains

  zone_id = var.cloudflare_zone_id
  name    = each.key
  value   = each.value.value
  type    = each.value.type
  proxied = each.value.proxied
  ttl     = each.value.proxied ? 1 : 300
  comment = "managed by terraform - staging"
}

# IPv6 רשומות (AAAA)
resource "cloudflare_record" "staging_aaaa" {
  for_each = length(local.app_ipv6) > 0 ? local.staging_subdomains : {}

  zone_id = var.cloudflare_zone_id
  name    = each.key
  value   = local.app_ipv6[0]
  type    = "AAAA"
  proxied = each.value.proxied
  ttl     = each.value.proxied ? 1 : 300
  comment = "managed by terraform - staging IPv6"
}

###############################################################################
# CAA - מאפשר רק Let's Encrypt לחתום על staging
###############################################################################

resource "cloudflare_record" "caa_letsencrypt" {
  zone_id = var.cloudflare_zone_id
  name    = "staging"
  type    = "CAA"
  ttl     = 3600

  data {
    flags = "0"
    tag   = "issue"
    value = "letsencrypt.org"
  }
}

###############################################################################
# Cloudflare Zone settings - HSTS, TLS 1.3, Always HTTPS
###############################################################################

resource "cloudflare_zone_settings_override" "staging" {
  zone_id = var.cloudflare_zone_id

  settings {
    always_use_https         = "on"
    automatic_https_rewrites = "on"
    min_tls_version          = "1.2"
    tls_1_3                  = "on"
    opportunistic_encryption = "on"
    ssl                      = "strict"
    brotli                   = "on"

    security_header {
      enabled            = true
      include_subdomains = true
      max_age            = 31536000
      nosniff            = true
      preload            = true
    }
  }
}
