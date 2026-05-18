<div dir="rtl">

# staging-deployment

אוטומציה מלאה להקמה ותפעול של סביבת ה-staging של פלטפורמת ה-catering.

## מבנה התיקייה

```
staging-deployment/
├── terraform/                 # Infrastructure as Code
│   ├── main.tf                # VPS provider (Hetzner / DO / Vultr)
│   ├── postgres.tf            # Managed Postgres
│   ├── redis.tf               # Managed Redis (Upstash / DO)
│   ├── r2.tf                  # Cloudflare R2 buckets
│   ├── dns.tf                 # Cloudflare DNS + HSTS
│   ├── variables.tf
│   ├── outputs.tf
│   ├── cloud-init.yaml        # bootstrap למכונה
│   └── templates/inventory.tpl
├── ansible/                   # Provisioning
│   ├── playbook.yml
│   ├── inventory.staging
│   ├── ansible.cfg
│   ├── requirements.yml
│   └── roles/
│       ├── docker/
│       ├── nginx/
│       └── monitoring/
├── scripts/
│   ├── deploy-staging.sh      # build + push + ssh deploy + migrate + smoke
│   ├── smoke-test.sh          # health, login, order, payment
│   ├── rollback-staging.sh
│   └── seed-staging.sh
├── .github/workflows/
│   └── staging-deploy.yml     # CI - מופעל ב-push ל-staging
├── nginx/staging.conf         # nginx standalone reference
├── monitoring/
│   ├── prometheus/prometheus.staging.yml
│   ├── grafana/datasources/staging.yml
│   └── slack-webhook.json
├── docker-compose.staging.yml # מועתק לשרת ב-deploy
├── .env.staging.example
├── staging.tfvars             # placeholders
├── staging-domains.md
├── STAGING-SETUP.md           # הקמה מאפס
├── RUNBOOK-STAGING.md         # תפעול שוטף
└── DEPLOYMENT-GUIDE.md        # pipeline צעד-צעד
```

## התחלה מהירה

```bash
# 1. תשתית
cd terraform && terraform init && terraform apply -var-file=../staging.tfvars

# 2. provisioning
cd ../ansible && ansible-playbook -i inventory.staging playbook.yml

# 3. פריסה
cd .. && ./scripts/deploy-staging.sh
```

ראו תיעוד מפורט ב-[STAGING-SETUP.md](./STAGING-SETUP.md).

</div>
