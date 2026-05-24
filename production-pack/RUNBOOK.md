<div dir="rtl" lang="he">

# ספר נהלים (RUNBOOK) — סביבת ייצור

> **SLA: 99.9% זמינות חודשית** (תקציב נפילה: כ-43 דקות לחודש).
> **RTO: 30 דקות** | **RPO: 5 דקות** (עם WAL streaming).

## תוכן עניינים
1. [תפקידים וכוננויות](#תפקידים-וכוננויות)
2. [תגובת תקרית (Incident Response)](#תגובת-תקרית)
3. [רמות חומרה (Severity)](#רמות-חומרה)
4. [פעולות נפוצות](#פעולות-נפוצות)
5. [בעיות נפוצות ופתרונן](#בעיות-נפוצות-ופתרונן)
6. [שחזור מאסונות (DR)](#שחזור-מאסונות)
7. [תקשורת ופוסט-מורטם](#תקשורת-ופוסט-מורטם)

---

## תפקידים וכוננויות

| תפקיד | אחריות | יצירת קשר |
|---|---|---|
| Incident Commander (IC) | מנהל את התקרית, מקבל החלטות, מסנכרן | רוטציה שבועית, PagerDuty |
| Tech Lead | מבצע הפעולות הטכניות בפועל | רוטציה שבועית |
| Comms | מעדכן לקוחות, סטטוס פייג', מנהלים | מנהל מוצר תורן |
| Scribe | תיעוד real-time בצ'אט התקרית | מצטרף לפי הצורך |

לוח כוננויות: PagerDuty schedule "primary-oncall".

---

## תגובת תקרית

### דקה 0–5: גילוי
1. הצהר תקרית בערוץ Slack `#incident-active`. השתמש בנוסח: *"INCIDENT: <תיאור קצר>. IC: @<שם>"*.
2. פתח דף סטטוס פנימי (Notion / Statuspage incident).
3. הפעל את ה-bridge הקולי (Google Meet / Zoom). הקישור קבוע בערוץ.

### דקה 5–15: ייצוב
1. **לפני חקירה — הקטן את הנזק:**
   - Rate limit חזק יותר ב-Nginx? (`limit_req_zone` ב-`conf.d/default.conf`)
   - הפעל maintenance mode דרך feature flag (אם קיים).
   - שקול **rollback מיידי** ב-Helm:
     ```bash
     helm history app -n production
     helm rollback app <prev_rev> -n production --wait --timeout 10m
     ```
2. בדוק את הדשבורד `errors-overview` ב-Grafana — מה השתנה?
3. בדוק את `business-overview` — האם משתמשים אמיתיים מושפעים?

### דקה 15+: חקירה
- לוגים: Grafana → Loki → `{service="next"} |= "error"`.
- מטריקות: `histogram_quantile(0.95, ...)` לפי route.
- Postgres: `SELECT * FROM pg_stat_activity WHERE state != 'idle';`
- Redis: `redis-cli --bigkeys`, `INFO memory`.

---

## רמות חומרה

| Sev | הגדרה | זמן תגובה | זימון |
|---|---|---|---|
| **Sev-1** | שירות חיוני למטה (אתר, תשלומים) | מיידי, 24/7 | IC + Tech Lead + Comms |
| **Sev-2** | פגיעה משמעותית (חלק מהמשתמשים, פיצ'ר ליבה) | תוך 30 ד', שעות פעילות מורחבות | IC + Tech Lead |
| **Sev-3** | בעיה מקומית, יש workaround | יום עסקים הבא | תורן בלבד |
| **Sev-4** | טכני בלבד, ללא השפעת משתמש | שבוע | תיעוד ב-issue |

---

## פעולות נפוצות

### deploy חירום
```bash
# רק לאחר חתימה של IC. אסור לדלג על staging אלא ב-Sev-1.
gh workflow run deploy-prod.yml -f sha=<SHA> -f strategy=blue -f skip_canary=true
```

### Rollback מהיר
```bash
helm rollback app -n production
# לפי תרחיש blue/green, החזרת ה-Service selector:
kubectl -n production patch svc app-next -p '{"spec":{"selector":{"slot":"blue"}}}'
```

### Restart pod
```bash
kubectl -n production rollout restart deploy/app-next
kubectl -n production rollout status  deploy/app-next --timeout 5m
```

### Scale חירום
```bash
kubectl -n production scale deploy/app-next --replicas=10
# כיבוי HPA זמני:
kubectl -n production patch hpa app-next -p '{"spec":{"minReplicas":10,"maxReplicas":20}}'
```

### Postgres — מי תופס מנעולים?
```sql
SELECT pid, usename, query_start, state, wait_event_type, wait_event, query
FROM pg_stat_activity
WHERE wait_event IS NOT NULL OR state = 'active'
ORDER BY query_start;

-- הריגת שאילתה תקועה:
SELECT pg_cancel_backend(<pid>);          -- ניסיון רגוע
SELECT pg_terminate_backend(<pid>);       -- ניתוק כפוי
```

### Redis — ניקוי מפתחות פגומים
```bash
redis-cli --scan --pattern 'cache:bad:*' | xargs -r -n 100 redis-cli del
```

### החלפת מפתחות (Rotation מיידי)
```bash
production-pack/secrets/rotation.sh aes
# מסיים בריסטרט אוטומטי של ה-Deployments.
```

### Backup ידני לפני שינוי מסוכן
```bash
production-pack/backups/backup-postgres.sh
# המתן שיעבור — וודא שהמפתח החדש מופיע ב-S3 לפני שממשיכים.
```

### purge CDN
```bash
curl -fsS -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_TOKEN}" -H "Content-Type: application/json" \
  --data '{"purge_everything": true}'
```

---

## בעיות נפוצות ופתרונן

### "5xx spike"
1. בדוק Alert. אם זה *route ספציפי* — חפש ב-Loki לפי `route="..."`.
2. אם זה *כל ה-routes* — הסתכל על infra: `pg_up`, `redis_up`, מצב node-ים.
3. אם השתחרר deploy ב-10 דקות האחרונות — **rollback first, debug second**.

### "Latency p95 > 500ms"
1. שאל את `pg_stat_statements`: שאילתה איטית חדשה?
2. בדוק את גודל ה-cache hit ratio ב-`business-overview`. נפילה ≈ סיבה.
3. בדוק קשרי-יתר ל-DB: `SELECT count(*) FROM pg_stat_activity WHERE state='active';`.
4. עליה ב-CPU או דיסק? קפץ ל-`system-overview`.

### "Payment failure spike"
1. סטטוס ספק התשלום (Stripe Status / Tranzila).
2. בדוק `payment_failures_total` לפי `provider` — אם רק ספק אחד, switch ל-fallback (אם הוגדר).
3. אל תבטל הזמנות אוטומטית. הפעל הודעה ללקוחות שיש עיכוב.

### "Queue lag"
1. בדוק `bull_queue_waiting`. אם > 1000:
   ```bash
   kubectl -n production scale deploy/app-worker --replicas=8
   ```
2. בדוק שאין פריט "poisoned" שגורם ל-retry אינסופי.

### "Disk filling up"
1. בדוק `system-overview` → mountpoint.
2. בדוק לוגים: `du -sh /var/lib/docker/containers/*/`. אם הגדרת logging תקינה — לא אמור לקרות.
3. backups לא נוקו? בדוק `backup-postgres.sh` retention.

---

## שחזור מאסונות

### תרחיש: Postgres primary מת
1. **תוך 1 דקה**: PagerDuty מתריע על `PostgresDown`.
2. הפעל failover ל-standby (אם הוגדר Patroni / managed service — אוטומטי).
3. אם אין standby:
   - הקם instance חדש.
   - הרץ `restore.sh full <latest_key>`.
   - הרץ `restore.sh pitr <key> "<incident_time - 30s>"` עם WAL לשחזור מדויק.
4. עדכן את הסיסמה ב-Vault, רענן את ה-secret ב-K8s, ריסטרט pods.

### תרחיש: כל ה-cluster נפל
1. ודא שיש לך גישה ל-kubeconfig מהבקאפ (לא רק ב-CI).
2. הקם cluster חדש (`terraform apply` מהריפו infra).
3. `helm install app production-pack/k8s -f values-prod.yaml`.
4. שחזר Postgres מ-R2/S3.
5. שחזר Redis (לא קריטי; אם אבד — cache cold-start בלבד).
6. עדכן DNS (TTL נמוך — 60 שניות — מוגדר מראש).

### תרחיש: דליפת סוד
1. **מיד**: `rotation.sh all`.
2. בטל את ה-token שדלף ב-Vault / Secrets Manager.
3. אם זה key של provider חיצוני — בטל אצלו, צור חדש, עדכן ב-Vault.
4. בדוק logs לאיתור גישה חשודה.
5. דווח לפי GDPR/חוק הגנת הפרטיות אם נחשפו נתוני משתמשים.

---

## תקשורת ופוסט-מורטם

### במהלך התקרית
- עדכון לקוחות כל 30 דקות (גם אם "ממשיכים לחקור").
- עדכון מנהלים כל 15 דקות ב-Sev-1.
- שמור את הצ'אט — הוא ה-source-of-truth לפוסט-מורטם.

### לאחר התקרית
תוך 48 שעות, IC כותב פוסט-מורטם blameless שכולל:
1. Timeline (UTC, לפי דקה).
2. Root cause (לא "human error" — תמיד יש סיבה מערכתית).
3. Contributing factors.
4. מה עבד טוב.
5. Action items (אחראי + תאריך יעד).

תבנית: `postmortems/YYYY-MM-DD-<slug>.md`. נסקר בישיבת ops הבאה.

</div>
