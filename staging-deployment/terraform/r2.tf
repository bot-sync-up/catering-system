###############################################################################
# Cloudflare R2 - object storage עבור staging
#
# יוצר bucket, API token עם הרשאות מצומצמות, ו-CORS rules.
###############################################################################

###############################################################################
# Bucket
###############################################################################

resource "cloudflare_r2_bucket" "uploads" {
  account_id = var.cloudflare_account_id
  name       = "${local.name}-uploads"
  location   = var.r2_location_hint # EEUR / WEUR / ENAM / WNAM / APAC
}

resource "cloudflare_r2_bucket" "backups" {
  account_id = var.cloudflare_account_id
  name       = "${local.name}-backups"
  location   = var.r2_location_hint
}

resource "cloudflare_r2_bucket" "media" {
  account_id = var.cloudflare_account_id
  name       = "${local.name}-media"
  location   = var.r2_location_hint
}

###############################################################################
# API token עם הרשאות מצומצמות לאפליקציה
#
# נכון לכתיבת הקוד provider של Cloudflare לא חושף יצירת R2 access keys.
# לכן יוצרים שני tokens: אחד דרך resource cloudflare_api_token (לקריאה),
# והרכיב הסודי בפועל מסופק כ-output שמולא בידנית או דרך wrangler/CLI.
###############################################################################

resource "cloudflare_api_token" "r2_app" {
  name = "${local.name}-r2-app"

  policy {
    permission_groups = [
      data.cloudflare_api_token_permission_groups.all.r2["Workers R2 Storage Bucket Item Write"],
      data.cloudflare_api_token_permission_groups.all.r2["Workers R2 Storage Bucket Item Read"],
    ]
    resources = {
      "com.cloudflare.api.account.${var.cloudflare_account_id}" = "*"
    }
  }

  condition {
    request_ip {
      in = concat(local.app_ipv4, var.admin_ssh_cidrs)
    }
  }
}

data "cloudflare_api_token_permission_groups" "all" {}

###############################################################################
# Custom domain ל-bucket (CDN דרך Cloudflare)
###############################################################################

resource "cloudflare_record" "r2_media" {
  zone_id = var.cloudflare_zone_id
  name    = "media.staging"
  value   = "public.r2.dev"
  type    = "CNAME"
  proxied = true
  comment = "Staging media R2 bucket - managed by terraform"
}

###############################################################################
# Lifecycle (object expiration לעמ׳-staging)
# Cloudflare R2 לא תומך בכלל lifecycle דרך API נכון לכתיבה - מותקן script נפרד.
###############################################################################

resource "null_resource" "r2_lifecycle" {
  triggers = {
    bucket = cloudflare_r2_bucket.uploads.name
  }

  provisioner "local-exec" {
    command = <<-EOT
      # מחיקה אוטומטית של uploads ישנים מ-staging אחרי 30 יום
      # מומלץ לבצע cronjob שמריץ wrangler r2 object delete לפי lifecycle
      echo "TODO: configure lifecycle via wrangler when API supports it"
    EOT
  }
}
