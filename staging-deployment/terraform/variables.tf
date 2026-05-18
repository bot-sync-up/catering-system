###############################################################################
# Variables - staging
###############################################################################

variable "project_name" {
  description = "שם הפרויקט - מופיע בכל שמות המשאבים"
  type        = string
  default     = "catering"
}

variable "cloud_provider" {
  description = "ספק VPS לשימוש: hetzner | digitalocean | vultr"
  type        = string
  default     = "hetzner"

  validation {
    condition     = contains(["hetzner", "digitalocean", "vultr"], var.cloud_provider)
    error_message = "cloud_provider חייב להיות אחד מ: hetzner, digitalocean, vultr."
  }
}

variable "postgres_provider" {
  description = "ספק Postgres מנוהל: neon | digitalocean | self_hosted"
  type        = string
  default     = "neon"
}

variable "redis_provider" {
  description = "ספק Redis: upstash | digitalocean | redis_cloud"
  type        = string
  default     = "upstash"
}

###############################################################################
# Tokens / API keys
###############################################################################

variable "hcloud_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "vultr_api_key" {
  description = "Vultr API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token - דורש Zone:DNS:Edit + R2:Read+Write"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID של הדומיין"
  type        = string
}

variable "neon_api_key" {
  description = "Neon Postgres API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "neon_region" {
  description = "Neon region (e.g. aws-eu-central-1)"
  type        = string
  default     = "aws-eu-central-1"
}

variable "upstash_email" {
  description = "Upstash account email"
  type        = string
  default     = ""
}

variable "upstash_api_key" {
  description = "Upstash management API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "upstash_region" {
  description = "Upstash Redis region"
  type        = string
  default     = "eu-west-1"
}

###############################################################################
# Networking / SSH
###############################################################################

variable "ssh_public_key" {
  description = "המפתח הציבורי לחיבור ssh ל-VPS"
  type        = string
}

variable "admin_user" {
  description = "שם משתמש הניהול במכונת ה-VPS"
  type        = string
  default     = "deploy"
}

variable "admin_ssh_cidrs" {
  description = "CIDRs המורשים להתחבר ב-SSH (port 22)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

###############################################################################
# Hetzner sizing
###############################################################################

variable "hcloud_image" {
  type    = string
  default = "ubuntu-22.04"
}

variable "hcloud_server_type" {
  description = "סוג מכונה: cx21 = 2vCPU 4GB, cpx21 = 3vCPU 4GB"
  type        = string
  default     = "cpx21"
}

variable "hcloud_location" {
  type    = string
  default = "nbg1" # Nuremberg
}

variable "app_node_count" {
  description = "כמות nodes לאפליקציה"
  type        = number
  default     = 1
}

###############################################################################
# DigitalOcean sizing
###############################################################################

variable "do_region" {
  type    = string
  default = "fra1"
}

variable "do_size" {
  type    = string
  default = "s-2vcpu-4gb"
}

variable "do_image" {
  type    = string
  default = "ubuntu-22-04-x64"
}

variable "do_postgres_size" {
  type    = string
  default = "db-s-1vcpu-1gb"
}

variable "do_redis_size" {
  type    = string
  default = "db-s-1vcpu-1gb"
}

###############################################################################
# Vultr sizing
###############################################################################

variable "vultr_plan" {
  type    = string
  default = "vc2-2c-4gb"
}

variable "vultr_region" {
  type    = string
  default = "fra"
}

variable "vultr_os_id" {
  description = "Vultr OS ID (1743 = Ubuntu 22.04 x64)"
  type        = number
  default     = 1743
}

###############################################################################
# Postgres
###############################################################################

variable "postgres_version" {
  type    = number
  default = 16
}

variable "postgres_volume_size" {
  description = "גודל volume ל-postgres self_hosted ב-GB"
  type        = number
  default     = 20
}

###############################################################################
# Redis
###############################################################################

variable "redis_version" {
  type    = string
  default = "7"
}

###############################################################################
# R2
###############################################################################

variable "r2_location_hint" {
  description = "ENAM | WNAM | EEUR | WEUR | APAC"
  type        = string
  default     = "WEUR"
}
