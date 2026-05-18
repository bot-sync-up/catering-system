###############################################################################
# Staging environment - main Terraform configuration
#
# רכיב מרכזי: מספק VPS עבור סביבת ה-staging.
# התומכים: Hetzner Cloud (ראשי), DigitalOcean ו-Vultr כ-stubs להחלפה.
# בחירת הספק מתבצעת דרך המשתנה var.cloud_provider.
###############################################################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.34"
    }
    vultr = {
      source  = "vultr/vultr"
      version = "~> 2.19"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.20"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    # ניתן להחליף ל-Cloudflare R2 backend באמצעות endpoint compatible
    bucket                      = "tfstate-staging"
    key                         = "staging/terraform.tfstate"
    region                      = "auto"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    force_path_style            = true
  }
}

###############################################################################
# Providers
###############################################################################

provider "hcloud" {
  token = var.hcloud_token
}

provider "digitalocean" {
  token = var.do_token
}

provider "vultr" {
  api_key = var.vultr_api_key
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

###############################################################################
# Locals
###############################################################################

locals {
  env  = "staging"
  name = "${var.project_name}-${local.env}"

  common_tags = {
    project     = var.project_name
    environment = local.env
    managed_by  = "terraform"
    owner       = "platform"
  }

  # רשימת תווי תיוג מותרים ל-Hetzner (key=value strings)
  hcloud_labels = {
    project     = var.project_name
    environment = local.env
    managed-by  = "terraform"
  }
}

###############################################################################
# SSH key
###############################################################################

resource "hcloud_ssh_key" "deployer" {
  count      = var.cloud_provider == "hetzner" ? 1 : 0
  name       = "${local.name}-deployer"
  public_key = var.ssh_public_key
  labels     = local.hcloud_labels
}

resource "digitalocean_ssh_key" "deployer" {
  count      = var.cloud_provider == "digitalocean" ? 1 : 0
  name       = "${local.name}-deployer"
  public_key = var.ssh_public_key
}

resource "vultr_ssh_key" "deployer" {
  count      = var.cloud_provider == "vultr" ? 1 : 0
  name       = "${local.name}-deployer"
  ssh_key    = var.ssh_public_key
}

###############################################################################
# Private network
###############################################################################

resource "hcloud_network" "staging" {
  count    = var.cloud_provider == "hetzner" ? 1 : 0
  name     = "${local.name}-net"
  ip_range = "10.20.0.0/16"
  labels   = local.hcloud_labels
}

resource "hcloud_network_subnet" "staging" {
  count        = var.cloud_provider == "hetzner" ? 1 : 0
  network_id   = hcloud_network.staging[0].id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = "10.20.1.0/24"
}

###############################################################################
# Firewall
###############################################################################

resource "hcloud_firewall" "staging" {
  count = var.cloud_provider == "hetzner" ? 1 : 0
  name  = "${local.name}-fw"

  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "22"
    source_ips = var.admin_ssh_cidrs
  }

  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction = "in"
    protocol  = "icmp"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  labels = local.hcloud_labels
}

###############################################################################
# VPS - Hetzner
###############################################################################

resource "hcloud_server" "app" {
  count       = var.cloud_provider == "hetzner" ? var.app_node_count : 0
  name        = "${local.name}-app-${count.index + 1}"
  image       = var.hcloud_image
  server_type = var.hcloud_server_type
  location    = var.hcloud_location
  ssh_keys    = [hcloud_ssh_key.deployer[0].id]
  firewall_ids = [hcloud_firewall.staging[0].id]
  labels       = local.hcloud_labels

  user_data = templatefile("${path.module}/cloud-init.yaml", {
    hostname    = "${local.name}-app-${count.index + 1}"
    admin_user  = var.admin_user
    ssh_pub_key = var.ssh_public_key
  })

  network {
    network_id = hcloud_network.staging[0].id
  }

  depends_on = [hcloud_network_subnet.staging]
}

###############################################################################
# VPS - DigitalOcean (stub)
###############################################################################

resource "digitalocean_droplet" "app" {
  count    = var.cloud_provider == "digitalocean" ? var.app_node_count : 0
  name     = "${local.name}-app-${count.index + 1}"
  region   = var.do_region
  size     = var.do_size
  image    = var.do_image
  ssh_keys = [digitalocean_ssh_key.deployer[0].id]
  tags     = ["staging", var.project_name]

  user_data = templatefile("${path.module}/cloud-init.yaml", {
    hostname    = "${local.name}-app-${count.index + 1}"
    admin_user  = var.admin_user
    ssh_pub_key = var.ssh_public_key
  })
}

###############################################################################
# VPS - Vultr (stub)
###############################################################################

resource "vultr_instance" "app" {
  count       = var.cloud_provider == "vultr" ? var.app_node_count : 0
  label       = "${local.name}-app-${count.index + 1}"
  hostname    = "${local.name}-app-${count.index + 1}"
  plan        = var.vultr_plan
  region      = var.vultr_region
  os_id       = var.vultr_os_id
  ssh_key_ids = [vultr_ssh_key.deployer[0].id]
  tags        = ["staging", var.project_name]

  user_data = templatefile("${path.module}/cloud-init.yaml", {
    hostname    = "${local.name}-app-${count.index + 1}"
    admin_user  = var.admin_user
    ssh_pub_key = var.ssh_public_key
  })
}

###############################################################################
# Unified server output - להחזרת ה-IP החיצוני ללא תלות בספק
###############################################################################

locals {
  app_ipv4 = (
    var.cloud_provider == "hetzner" ? [for s in hcloud_server.app : s.ipv4_address] :
    var.cloud_provider == "digitalocean" ? [for s in digitalocean_droplet.app : s.ipv4_address] :
    var.cloud_provider == "vultr" ? [for s in vultr_instance.app : s.main_ip] :
    []
  )

  app_ipv6 = (
    var.cloud_provider == "hetzner" ? [for s in hcloud_server.app : s.ipv6_address] :
    var.cloud_provider == "digitalocean" ? [for s in digitalocean_droplet.app : s.ipv6_address] :
    var.cloud_provider == "vultr" ? [for s in vultr_instance.app : s.v6_main_ip] :
    []
  )
}
