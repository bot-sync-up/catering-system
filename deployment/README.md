<div dir="rtl" lang="he">

# Production Readiness Pack

חבילת deployment מלאה ל-monorepo: 20 אפליקציות Next.js, worker, Postgres, Redis, ניטור, גיבויים, סודות, מיגרציות, ביצועים, בדיקות עומס ופונטים בעברית.

## תוכן

| תיקייה | תכולה |
|---|---|
| `docker/` | docker-compose.prod.yml + Dockerfiles + nginx config |
| `k8s/` | Helm chart (Deployment, Service, Ingress, HPA, NetworkPolicy, PDB) + values לכל סביבה |
| `ci/` | GitHub Actions workflows: ci, deploy-staging, deploy-prod, security-scan, release |
| `monitoring/` | Prometheus + alerts, Grafana dashboards (system, business, errors), Loki/Promtail, Uptime Kuma, Sentry guide |
| `backups/` | backup-postgres / backup-redis / restore (PITR) / verify-restore + lifecycle policy |
| `secrets/` | Vault config + policies + rotation script + מדריכי AWS SM ו-Doppler |
| `migrations/` | merge-migrations.ts (24->1) + pre-deploy-check.sh + Rollback strategy |
| `performance/` | Caching, CDN, image optimization, DB index audit |
| `load-tests/` | k6 - ordering / payment / OCR |
| `fonts/` | Heebo + Frank Ruhl Libre + PDF helper |
| `RUNBOOK.md` | ספר נהלים (Hebrew, RTL) - on-call, incident response, DR |
| `PRE-LAUNCH-CHECKLIST.md` | 80+ פריטים לבדיקה לפני production |

## התחלה מהירה

### 1. סודות
```
cp deployment/docker/.env.prod.example deployment/secrets/.env.prod
# מלא ערכים, או טען מ-Vault:
vault kv get -format=json platform/data/all | jq -r ... > deployment/secrets/.env.prod
```

### 2. Docker compose (single-host)
```
docker compose -f deployment/docker/docker-compose.prod.yml --env-file deployment/secrets/.env.prod up -d
```

### 3. Kubernetes
```
helm upgrade --install platform deployment/k8s/chart \
  --namespace production --create-namespace \
  -f deployment/k8s/values/prod.yaml \
  --set image.tag=v1.0.0
```

### 4. בדיקות
```
bash deployment/backups/verify-restore.sh     # שיחזור גיבוי
k6 run deployment/load-tests/ordering-flow.js # עומס
bash deployment/performance/db-index-audit.sh # אודיט אינדקסים
```

## מתודולוגיה

- **Defense in depth** - NGINX WAF + app rate limit + DB advisory locks.
- **Zero-trust secrets** - Vault + ExternalSecretsOperator. אסור `.env` ב-Git.
- **Backup הכפלה גיאוגרפית** - R2 + S3 cross-region replication.
- **Observability raceways**: Prometheus (metrics) + Loki (logs) + Sentry (errors) + Grafana (single pane of glass).
- **Progressive delivery** - canary 10% -> 100% עם health gates.

## תלות חיצונית

- Cloudflare (DNS + CDN + R2)
- Let's Encrypt (certbot)
- Sentry SaaS / self-host
- iCount + Cardcom (תשלומים)
- WhatsApp Business API
- AWS S3 או R2 (backups + assets)

## רישוי
תוכן זה הוא חלק מהמונורפו. כל הסקריפטים והקונפיגורציה תחת MIT (אלא אם נכתב אחרת).

</div>
