<div dir="rtl">

# הקמת סביבת Staging מאפס

מדריך זה מתאר את כל השלבים להקמה של סביבת `staging.catering.co.il` החל
מ-zero ועד pipeline פעיל ושירות חי. כל שלב ניתן להרצה עצמאית.

---

## תוכן עניינים

1. [דרישות מקדימות](#דרישות-מקדימות)
2. [שלב 1 — קונפיגורציית סודות וטוקנים](#שלב-1)
3. [שלב 2 — Terraform: תשתית](#שלב-2)
4. [שלב 3 — Ansible: provisioning](#שלב-3)
5. [שלב 4 — בנייה ראשונה ו-deploy](#שלב-4)
6. [שלב 5 — Seed + smoke](#שלב-5)
7. [שלב 6 — מוניטורינג + התראות](#שלב-6)
8. [שלב 7 — חיבור CI](#שלב-7)
9. [בעיות נפוצות](#בעיות-נפוצות)

---

<a id="דרישות-מקדימות"></a>
## דרישות מקדימות

- חשבון Cloudflare עם זון `catering.co.il` מנוהל.
- חשבון Hetzner / DigitalOcean / Vultr (לפי `cloud_provider`).
- חשבון Neon (Postgres) או DigitalOcean Managed PG.
- חשבון Upstash (Redis).
- Docker Registry — מומלץ GHCR דרך GitHub Actions.
- כלים מקומיים:
  - `terraform >= 1.5`
  - `ansible >= 2.15` + `ansible-galaxy install -r requirements.yml`
  - `docker` + `buildx`
  - `gh` CLI (לחיבור secrets ל-Actions)
  - `jq`, `curl`, `openssl`

---

<a id="שלב-1"></a>
## שלב 1 — קונפיגורציית סודות וטוקנים

### 1.1 יצירת tokens

| ספק        | הרשאות נדרשות                                  |
|------------|------------------------------------------------|
| Hetzner    | `Read & Write` על Projects                     |
| Cloudflare | `Zone:DNS:Edit`, `Account:R2:Edit`, `Zone:Zone:Edit` |
| Neon       | `projects.write`                               |
| Upstash    | management API key                             |
| GitHub     | PAT עם `write:packages` (אם לא משתמשים ב-GHCR token) |

### 1.2 הזרמה ל-CI

```bash
gh secret set STAGING_HOST --body "1.2.3.4"
gh secret set STAGING_USER --body "deploy"
gh secret set STAGING_SSH_KEY < ~/.ssh/staging_deploy_ed25519
gh secret set STAGING_DB_URL --body "postgres://..."
gh secret set STAGING_REDIS_URL --body "rediss://..."
gh secret set STAGING_JWT_SECRET --body "$(openssl rand -hex 32)"
gh secret set STAGING_STRIPE_KEY --body "sk_test_..."
gh secret set STAGING_R2_ACCESS_KEY --body "..."
gh secret set STAGING_R2_SECRET_KEY --body "..."
gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/services/..."
```

### 1.3 קובץ `.env.staging` מקומי

```bash
cp .env.staging.example .env.staging
# החליפו את כל SECRETS_PLACEHOLDER לערכים אמיתיים
```

---

<a id="שלב-2"></a>
## שלב 2 — Terraform: תשתית

```bash
cd terraform/

# Init - חשוב לקנפג backend (R2 / S3) לפני אפליי ראשון
terraform init

# העדפה: לייצא tokens כ-ENV ולא להכניס ל-tfvars
export TF_VAR_hcloud_token=...
export TF_VAR_cloudflare_api_token=...
export TF_VAR_neon_api_key=...
export TF_VAR_upstash_api_key=...

# Plan ראשון
terraform plan -var-file=../staging.tfvars

# Apply (מומלץ דקה דקה כדי לראות שגיאות מוקדם)
terraform apply -var-file=../staging.tfvars

# שמירת outputs ל-Ansible
terraform output -raw ansible_inventory > ../ansible/inventory.staging
terraform output -raw postgres_connection_string  # להעתיק ל-.env.staging
terraform output -raw redis_connection_string
terraform output -raw r2_api_token
```

> **הערה:** ה-state נשמר ב-R2 (חוסם concurrent applies). אם רוצים Hetzner local
> state, החליפו את ה-backend ב-`main.tf`.

---

<a id="שלב-3"></a>
## שלב 3 — Ansible: provisioning

```bash
cd ansible/
ansible-galaxy install -r requirements.yml

# בדיקת קישוריות
ansible -i inventory.staging staging_app -m ping

# הרצה מלאה (docker + nginx + monitoring)
ansible-playbook -i inventory.staging playbook.yml \
  --extra-vars "domain=staging.catering.co.il acme_email=ops@catering.co.il"

# הרצה לפי טאג בלבד
ansible-playbook -i inventory.staging playbook.yml --tags nginx
```

זה יבצע:

1. עדכון apt + התקנות בסיס.
2. התקנת Docker Engine + Compose v2.
3. התקנת nginx + certbot + הוצאת תעודות LE לכל הדומיינים.
4. הרמת stack של Prometheus / Grafana / Alertmanager / cAdvisor.
5. הקשחה (UFW, fail2ban, sshd).

---

<a id="שלב-4"></a>
## שלב 4 — בנייה ראשונה ו-deploy

```bash
export STAGING_HOST=$(terraform -chdir=terraform output -raw app_servers_ipv4 | jq -r '.[0]')
export STAGING_USER=deploy
export STAGING_SSH_KEY=~/.ssh/staging_deploy_ed25519
export REGISTRY=ghcr.io/<org>/catering
export SLACK_WEBHOOK_URL=...

# build + push + deploy + smoke
./scripts/deploy-staging.sh --tag $(git rev-parse --short HEAD)
```

---

<a id="שלב-5"></a>
## שלב 5 — Seed + smoke

```bash
# הזרמת נתוני דמו
RESET=true ./scripts/seed-staging.sh

# בדיקות מהירות
STAGING_BASE_URL=https://api.staging.catering.co.il \
  ./scripts/smoke-test.sh
```

המשתמש לדמו:
- `smoke-test@staging.catering.co.il` / `SmokeTest!2026`
- admin: `admin@staging.catering.co.il` / `Admin!2026Demo`

---

<a id="שלב-6"></a>
## שלב 6 — מוניטורינג + התראות

1. גש ל-`https://grafana.staging.catering.co.il` (admin/changeme-staging).
2. שנה סיסמה.
3. צרף את ה-dashboards מהתיקייה `monitoring/grafana/dashboards/` (Node /
   Postgres / Nginx / Application).
4. ב-Alertmanager החלף `${SLACK_WEBHOOK_URL}` לערכים אמיתיים והרץ
   `docker compose restart alertmanager`.

---

<a id="שלב-7"></a>
## שלב 7 — חיבור CI

ה-workflow `.github/workflows/staging-deploy.yml` כבר מוכן. הוא מופעל בכל
push ל-`staging`. לקיק־סטארט ידני:

```bash
gh workflow run staging-deploy.yml -f tag=$(git rev-parse HEAD)
gh run watch
```

---

<a id="בעיות-נפוצות"></a>
## בעיות נפוצות

| תקלה                                | פתרון                                              |
|-------------------------------------|----------------------------------------------------|
| `certbot: too many requests`        | LE rate limit — חכו שעה או השתמשו ב-`--staging`    |
| `nginx: address already in use`     | `systemctl stop apache2` או הסירו שירות ישן       |
| `docker compose pull` נכשל          | בדקו `docker login ghcr.io` ב-VPS                   |
| Migration נכשלה                     | הריצו `rollback-staging.sh` ובדקו logs              |
| Slack לא מתריע                      | בדקו ש-`SLACK_WEBHOOK_URL` קיים גם בקוד וגם ב-CI    |

</div>
