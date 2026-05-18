###############################################################################
# staging.tfvars - placeholder values
# הזרמה אמיתית: terraform apply -var-file=staging.tfvars
# החליפו את כל ה-CHANGE_ME / SECRETS_PLACEHOLDER לפני הרצה.
###############################################################################

project_name = "catering"
cloud_provider    = "hetzner"   # hetzner | digitalocean | vultr
postgres_provider = "neon"      # neon | digitalocean | self_hosted
redis_provider    = "upstash"   # upstash | digitalocean | redis_cloud

# Provider tokens (move to environment variables in CI):
#   export TF_VAR_hcloud_token=...
#   export TF_VAR_cloudflare_api_token=...
hcloud_token         = "SECRETS_PLACEHOLDER_HCLOUD_TOKEN"
do_token             = "SECRETS_PLACEHOLDER_DO_TOKEN"
vultr_api_key        = "SECRETS_PLACEHOLDER_VULTR_KEY"
cloudflare_api_token = "SECRETS_PLACEHOLDER_CF_TOKEN"
cloudflare_account_id = "CHANGE_ME_CF_ACCOUNT_ID"
cloudflare_zone_id    = "CHANGE_ME_CF_ZONE_ID"

neon_api_key  = "SECRETS_PLACEHOLDER_NEON_KEY"
neon_region   = "aws-eu-central-1"

upstash_email   = "ops@catering.co.il"
upstash_api_key = "SECRETS_PLACEHOLDER_UPSTASH_KEY"
upstash_region  = "eu-west-1"

# SSH
ssh_public_key  = "ssh-ed25519 AAAA_CHANGE_ME deploy@staging"
admin_user      = "deploy"
admin_ssh_cidrs = ["0.0.0.0/0"] # מומלץ להצר ל-IP של מערכת ה-CI/VPN

# Hetzner sizing
hcloud_image       = "ubuntu-22.04"
hcloud_server_type = "cpx21"
hcloud_location    = "nbg1"
app_node_count     = 1

# DigitalOcean
do_region        = "fra1"
do_size          = "s-2vcpu-4gb"
do_image         = "ubuntu-22-04-x64"
do_postgres_size = "db-s-1vcpu-1gb"
do_redis_size    = "db-s-1vcpu-1gb"

# Vultr
vultr_plan   = "vc2-2c-4gb"
vultr_region = "fra"
vultr_os_id  = 1743

# Postgres / Redis
postgres_version     = 16
postgres_volume_size = 20
redis_version        = "7"

# R2
r2_location_hint = "WEUR"
