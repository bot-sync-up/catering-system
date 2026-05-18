<div dir="rtl">

# Runbook תפעולי

> מסמך זה מיועד למפעיל המערכת (DevOps/On-call). מצב חירום ראשון — `#alerts-prod` בסלאק. מצב חירום שני — להתקשר ל-CTO.

## אנשי קשר

| תפקיד | שם | טלפון | זמינות |
|------|----|------|--------|
| On-call ראשון | רוטציה | רשימה ב-PagerDuty | 24/7 |
| DBA | TBD | TBD | שעות עבודה |
| CTO | TBD | TBD | חירום בלבד |
| ספק תשלומים (Tranzila) | תמיכה | 03-7676777 | 24/7 |

## בריאות מערכת — בדיקה מהירה

```bash
# בריאות כללית
curl -sS https://www.example.co.il/healthz
curl -sS https://portal.example.co.il/api/health
curl -sS https://admin.example.co.il/healthz

# סטטוס containers
ssh prod "docker compose ps"

# Postgres
ssh prod "docker exec app-postgres pg_isready"

# Redis
ssh prod "docker exec app-redis redis-cli ping"
```

## תקלות שכיחות

### 1. שיעור 5xx גבוה

**זיהוי**: התראה `HighErrorRate` ב-Grafana.

**פעולה**:
1. בדוק dashboard "Errors & Latency".
2. צפה ב-Loki: `{service="gateway"} |= "ERROR"`.
3. אם הכשל נקודתי (route מסוים) — שקול rollback של ה-image.
4. אם כלל-מערכתי — בדוק DB/Redis (סעיף 3 ו-4).

**Rollback**:
```bash
ssh prod "cd /opt/app && git checkout $(git tag --sort=-creatordate | sed -n '2p')"
ssh prod "docker compose -f deployment/docker/docker-compose.yml \
  -f deployment/docker/docker-compose.prod.yml up -d"
```

### 2. Latency גבוה (p95 > 1s)

1. בדוק "Slowest routes" ב-dashboard.
2. PG slow query log: `docker exec app-postgres tail -f /var/log/postgresql/postgresql.log | grep duration`.
3. אם נראה N+1 — gather support, frame for backlog, אבל הוסף cache זמני ב-Redis.

### 3. Postgres לא זמין

1. `docker logs app-postgres --tail 200`.
2. אם crash loop — שמור volume, בדוק corruption: `pg_controldata /var/lib/postgresql/data`.
3. ב-corruption: עצור, restore מ-backup אחרון (`deployment/backups/restore.sh latest`).
4. הודע ל-DBA תוך 5 דקות.

### 4. Redis לא זמין

1. נסה restart: `docker restart app-redis`.
2. אם נכשל — ב-prod יש replication. Failover אוטומטי באמצעות Sentinel.
3. סשנים: המשתמשים יצטרכו להיכנס מחדש. הודעה ב-banner.

### 5. תור BullMQ נסתם

```bash
docker exec app-worker node -e "
  const { Queue } = require('bullmq');
  const q = new Queue('ocr', { connection: { host: 'redis', port: 6379 }});
  q.getJobCounts().then(console.log).then(() => process.exit(0));
"
```

אם waiting > 5000 — scale up workers:
```bash
docker compose -f .../docker-compose.prod.yml up -d --scale worker=8
```

### 6. תשלומים נכשלים

1. בדוק dashboard "Business KPIs" → "תשלומים שנכשלו".
2. אם spike — בדוק לוגים של ספק (Tranzila/Stripe) דרך ה-dashboard שלהם.
3. הודע ב-Slack `#payments`.

### 7. דיסק מלא

```bash
# מי תופס
docker system df
du -sh /var/lib/docker/volumes/*

# ניקוי image-ים ישנים
docker system prune -af --filter "until=72h"

# גיבויים ישנים (אמורים להתנקות אוטומטית)
find /var/backups -type f -mtime +30 -delete
```

## נהלי דחיפות (severity)

| רמה | זמן תגובה | דוגמאות |
|-----|----------|---------|
| SEV1 | 5 דק' | אתר למטה, תשלומים נכשלים, איבוד נתונים |
| SEV2 | 30 דק' | latency חורג מ-SLA, תקלת אזור |
| SEV3 | 4 שעות | באג קוסמטי, תקלה ב-feature משני |
| SEV4 | יום עסקים | בקשת שיפור |

## פוסט-מורטם

לאחר כל SEV1/SEV2 — מסמך פוסט-מורטם תוך 48 שעות:
1. ציר זמן.
2. השפעה.
3. סיבה שורש (5 למה).
4. פעולות מתקנות עם owner ותאריך יעד.
5. **אין האשמות אישיות** (blameless).

</div>
