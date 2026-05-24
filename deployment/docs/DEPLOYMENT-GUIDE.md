<div dir="rtl">

# מדריך פריסה (Deployment Guide)

## ארכיטקטורת פריסה

```
                  ┌─────────────┐
       internet → │ Cloudflare  │ → WAF + CDN
                  └──────┬──────┘
                         │
                  ┌──────▼──────┐
                  │ nginx (443) │ ← TLS + HSTS + rate-limit
                  └──┬──────┬───┘
              www  ↓  ↓ portal  ↓ admin
       ┌──────────┐  ┌──────────┐
       │ next x2  │  │ gateway  │ ← x3 instances
       └────┬─────┘  └────┬─────┘
            │             │
            └──────┬──────┘
                   ▼
             ┌─────────┐    ┌─────────┐
             │postgres │    │  redis  │
             └─────────┘    └─────────┘
                   ▲
             ┌─────┴────┐
             │ worker x4│ (OCR, PDF, email)
             └──────────┘
```

## דרישות מקדימות

| תוכנה | גרסה מינימלית |
|--------|--------------|
| Docker | 24+ |
| Docker Compose | 2.20+ |
| Git | 2.30+ |
| AWS CLI (R2) | 2.13+ |
| GPG | 2.2+ |

## פריסה ראשונית (greenfield)

### 1. הקצאת שרת
- 4 vCPU, 8GB RAM, 100GB SSD (minimum prod).
- Ubuntu 22.04 LTS.
- Hardened SSH (key-only, fail2ban).

### 2. Bootstrap
```bash
# על השרת
sudo apt update && sudo apt install -y docker.io docker-compose-plugin gpg
sudo usermod -aG docker $USER

mkdir -p /opt/app && cd /opt/app
git clone https://github.com/<org>/<repo>.git .

# כתובות + סודות
cp deployment/docker/.env.example .env
# ערוך את .env — DB password, JWT secret, R2 credentials
```

### 3. סטטוס סודות
שלוף את הסודות מ-Vault או הזרק אותם ל-`.env`:
```bash
vault kv get -mount=secret -field=value app/prod/db-password > /dev/null  # rehearsal
```

### 4. הקמת תעודות SSL
```bash
# Let's Encrypt דרך certbot (או העלאה ידנית של certs)
docker run --rm -p 80:80 -v /opt/app/deployment/docker/certs:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d www.example.co.il -d portal.example.co.il -d admin.example.co.il
```

### 5. עליית שירותים
```bash
cd /opt/app
docker compose \
  -f deployment/docker/docker-compose.yml \
  -f deployment/docker/docker-compose.prod.yml \
  up -d
```

### 6. אימות
```bash
curl -sSf https://www.example.co.il/healthz
curl -sSf https://portal.example.co.il/api/health
curl -sSf https://admin.example.co.il/healthz
```

## פריסה רגילה (continuous)

זרימה: PR → review → merge to `main` → CI builds image → manual tag `vX.Y.Z` → GitHub Action `deploy-prod.yml`.

```bash
# יצירת tag
git tag v1.4.0 -m "release: v1.4.0"
git push origin v1.4.0
# Action ייכנס למצב approval, מאשר אנושית, ואז פורס.
```

## פריסת hotfix

```bash
git checkout -b hotfix/x main
# fix + commit
git push origin hotfix/x
# PR → squash merge → tag v1.4.1 → deploy
```

## Rollback

### דרך GitHub Action (מומלץ)
Re-run של ה-action האחרון הירוק עם input `ref=v1.3.9`.

### ידני (חירום)
```bash
ssh prod
cd /opt/app
git checkout v1.3.9  # tag הקודם
docker compose -f deployment/docker/docker-compose.yml \
               -f deployment/docker/docker-compose.prod.yml \
               pull
docker compose ... up -d
```

## Migrations

- Migrations רצות אוטומטית בעליית ה-gateway (CMD: `npm run migrate && node dist/server.js`).
- migrations הרסניות (DROP COLUMN/TABLE) — בשלבים: deploy code שיודע לחיות בלי, אחר כך migration.
- בכל migration: גיבוי לפני (`backup-postgres.sh pre-migration`).

## פריסה לסביבת staging

אוטומטית בכל push ל-`develop`. URL: `https://staging.example.co.il`.

</div>
