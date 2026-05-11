<div dir="rtl" lang="he">

# ספר נהלים (Runbook) - הפעלה ותפעול

> **SLA יעד**: 99.9% uptime (43 דק' downtime לחודש מותרים).
> **RTO** (Recovery Time Objective) - 30 דקות.
> **RPO** (Recovery Point Objective) - 15 דקות.

## תוכן עניינים
1. [ארכיטקטורה במבט-על](#ארכיטקטורה)
2. [On-call](#on-call)
3. [תגובה לאירועים](#תגובה-לאירועים)
4. [פעולות נפוצות](#פעולות-נפוצות)
5. [שיחזור מאסון (DR)](#שיחזור-מאסון)
6. [מפתחות וחשבונות](#מפתחות-וחשבונות)

---

## ארכיטקטורה

```
                +----- Cloudflare CDN -----+
                            |
                            v
                  [ NGINX LB / TLS termination ]
                            |
        +-------+-----------+-----------+-------+
        |       |           |           |       |
       web    admin    customer ...  api-gw   driver
        \\______|___________|___________|______//
                   |              |
                   v              v
              [ PostgreSQL ]  [ Redis ]
                   |
              [ WAL archive (S3) ]
```
- 20 אפליקציות Next.js, כל אחת running standalone (port 3000).
- Worker (BullMQ) - 3 replicas, scale עד 20 על HPA.
- Postgres 16 single primary + WAL streaming ל-S3.
- Redis 7 לקאש + תור (BullMQ).

---

## On-call

### תורנות (PagerDuty)
- **Primary on-call**: סבב שבועי.
- **Secondary**: מגיב תוך 15 דק' אם primary לא הגיב.
- **Escalation**: 30 דק' ללא ack -> CTO.

### תקשורת בזמן incident
- צ'אנל ייעודי: `#incident-<date>` ב-Slack.
- עדכון Status Page בכל 15 דק'.
- "Customer-facing" - מי שמדבר עם הלקוחות בלבד.

### חומרות
| Severity | משמעות | תגובה |
|---|---|---|
| SEV1 | חוץ-לקוח מלא | תוך 5 דק', PagerDuty page |
| SEV2 | יכולת חלקית פגומה | תוך 15 דק' |
| SEV3 | אזהרה / לקוח אחד | תוך שעה |
| SEV4 | bug / cosmetic | קלפי |

---

## תגובה לאירועים

### 1. DB down - "PostgresDown" alert

**אבחון**
```
kubectl -n prod logs sts/postgres --tail=200
kubectl -n prod describe pod postgres-0
psql $DATABASE_URL -c "SELECT 1"
```

**צעדים**
1. ודא ש-pod רץ. אם CrashLoopBackOff - בדוק filesystem (`df -h` בתוך הקונטיינר).
2. אם disk מלא - הרחב PVC:
   ```
   kubectl patch pvc data-postgres-0 -n prod -p '{"spec":{"resources":{"requests":{"storage":"600Gi"}}}}'
   ```
3. אם DB עצמו נפל אחרי OOM - הגדל `resources.limits.memory` ב-`values/prod.yaml` -> `helm upgrade`.
4. אם data corruption - חזור ל-DR (סעיף נפרד).

**אימות**
- `up{job="postgres"} == 1` ב-Prometheus.
- `/api/health` של כל app מחזיר 200.

---

### 2. תור תקוע - "BullMQQueueLag"

**אבחון**
- פתח https://queues.example.com (BullMQ board, מאחורי basic auth).
- מצא את התור הצובר waiting.

**צעדים**
1. בדוק worker logs: `kubectl -n prod logs deploy/worker --tail=200 | grep <queue-name>`.
2. אם worker מפסיק לעבד בגלל error חוזר:
   - העבר ל-DLQ: ב-Board, drain waiting -> failed.
   - תקן את ה-root cause (קוד / external API).
3. הגדל זמנית את replicas:
   ```
   kubectl -n prod scale deploy/worker --replicas=10
   ```
4. אם external API נפל - הפעל `circuit-breaker` flag דרך `/api/admin/flags`.

---

### 3. תשלומים נופלים - "PaymentFailureSpike"

**אבחון**
- Grafana - Business dashboard - "Top failure reasons".
- בדוק status pages: https://status.icount.co.il, Cardcom.

**צעדים**
1. אם ספק תשלום אחד נפל - הפעל פעולה:
   - `/api/admin/payment-providers/<name>/disable`
   - traffic יעבור אוטומטית לספק השני.
2. אם שניהם נפלו - הפעל "manual payment" flow (מספר טלפון להתקשר).
3. עדכן Status Page + Slack `#payments`.

---

### 4. Sentry-spike: שגיאות ב-app אחד

1. ב-Sentry -> filter by `app` tag -> top issue.
2. בדוק stack trace + breadcrumbs.
3. אם רגרסיה מ-deploy אחרון: `helm rollback platform <previous-revision>`.
4. אם external dependency (Google Maps וכו'): הפעל graceful fallback flag.

---

### 5. SSL cert לא מתחדש

1. `kubectl -n cert-manager logs deploy/cert-manager`.
2. `kubectl describe certificate wildcard-tls -n prod`.
3. ודא ש-Cloudflare API token תקין.
4. נסה manual: `kubectl delete certificaterequest -n prod --all` -> חידוש.

---

## פעולות נפוצות

### Scale up זמני
```
kubectl -n prod scale deploy/app-web --replicas=20
# HPA יחזיר אותו אחרי 5 דק' של היפר-אם CPU ירד; כדי להפיק:
kubectl -n prod patch hpa app-web -p '{"spec":{"minReplicas":5}}'
```

### Restart all apps
```
kubectl -n prod rollout restart deploy
```

### Connect to DB (read-only)
```
kubectl -n prod port-forward sts/postgres 5432:5432
PGPASSWORD=$(kubectl -n prod get secret platform-secrets -o jsonpath='{.data.POSTGRES_RO_PASSWORD}' | base64 -d) \
  psql -U app_ro -h localhost appdb
```

### Force flush Redis
```
redis-cli -h redis.internal -a $REDIS_PASSWORD FLUSHDB ASYNC
```
זהירות - יגרום לקאש cold (latency ספייק).

### Rotate JWT secret
```
tsx deployment/secrets/rotate-secrets.ts --key auth/jwt
# הפצה: ExternalSecrets מסנכרן תוך דקה. אפליקציות יקבלו secret חדש בלי restart.
# JWTs ישנים עדיין יאומתו ל-7 ימים (previousKid).
```

### Restore מהבאקאפ האחרון
```
bash deployment/backups/restore.sh \
  --backup s3://app-prod/prod/daily/$(date -u +%Y%m%d)T030000Z-appdb.sql.zst.age \
  --target-db appdb_restore
# בדיקה -> swap:
psql -c "ALTER DATABASE appdb RENAME TO appdb_old; ALTER DATABASE appdb_restore RENAME TO appdb;"
```

### Point-in-time recovery
```
bash deployment/backups/restore.sh \
  --backup s3://.../yesterday.sql.zst.age \
  --target-time "2025-11-12 14:35:00 UTC"
```

---

## שיחזור מאסון

### תרחיש: cluster k8s שלם מת
1. `terraform apply` ב-מודול `infra/` (יוצר cluster חדש).
2. `kubectl apply -f deployment/k8s/bootstrap/` (CRDs, cert-manager, ESO).
3. `helm install platform deployment/k8s/chart -f values/prod.yaml`.
4. שחזר DB: `deployment/backups/restore.sh --backup s3://.../latest.sql.zst.age`.
5. רענן DNS ל-LB החדש (Cloudflare API).
6. רענן certs (cert-manager יבקש אוטומטית).
7. הפעל smoke tests.

צפי - 60-90 דק' (תלוי בגודל DB).

### תרחיש: data corruption
1. עצור writes - הפעל maintenance flag (`/api/admin/maintenance`).
2. הקפא traffic ב-NGINX (`return 503;` זמני).
3. שחזור PITR ל-5 דק' לפני התקלה.
4. ולידציה ע"י QA צוות (חצי שעה).
5. swap + הסר maintenance.

---

## מפתחות וחשבונות

| שירות | מיקום | בעלים |
|---|---|---|
| Cloudflare | 1Password vault "Infra" | CTO |
| AWS root | 1Password (MFA hw token) | CTO |
| Sentry | Vault `obs/sentry` | Platform |
| iCount | Vault `payments/icount` | Finance |
| Cardcom | Vault `payments/cardcom` | Finance |
| WhatsApp Business | Vault `whatsapp/api` | Marketing |
| GitHub bot-sync-up PAT | Vault `ci/github` | DevOps |
| Domain registrar | 1Password "Domains" | CTO |

</div>
