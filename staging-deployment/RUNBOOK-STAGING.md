<div dir="rtl">

# Runbook — סביבת Staging

תפעול שוטף, בדיקות יומיות, וסיוע בתקלות תקופתיות.

---

## משטחי שליטה

- **Grafana:** https://grafana.staging.catering.co.il
- **Prometheus:** http://metrics.staging.catering.co.il:9090 (פנימי בלבד)
- **Alertmanager:** http://localhost:9093 (דרך SSH tunnel)
- **GitHub Actions:** https://github.com/<org>/catering/actions
- **Slack:** `#staging-alerts`, `#staging-deploys`

---

## משימות יומיות (חכ׳ם אוטומציה)

| שעה  | פעולה                              | היכן                                |
|------|------------------------------------|-------------------------------------|
| 02:00| Backup Postgres ל-R2               | cron על VPS                         |
| 03:30| חידוש Let's Encrypt                | `certbot renew` cron                 |
| 05:00| מחיקת media uploads > 30 ימים      | wrangler r2 cleanup                  |
| 09:00| smoke-test תקופתי                  | GitHub schedule workflow             |

---

## פעולות שגרתיות

### בדיקת סטטוס מהירה

```bash
ssh deploy@staging.catering.co.il "cd /opt/catering-staging && docker compose ps"
```

### צפייה ב-logs בזמן אמת

```bash
ssh deploy@staging.catering.co.il \
  "cd /opt/catering-staging && docker compose logs -f --tail=200 api"
```

### Restart של שירות בודד

```bash
ssh deploy@staging.catering.co.il \
  "cd /opt/catering-staging && docker compose restart api"
```

### עדכון תג ידני (ללא CI)

```bash
TAG=abc1234 ./scripts/deploy-staging.sh --skip-build
```

### Rollback

```bash
PREV_TAG=abc1234 ./scripts/rollback-staging.sh
```

### Re-seed (מאפס נתונים!)

```bash
RESET=true ./scripts/seed-staging.sh
```

---

## תקלות נפוצות וטיפול

### השרת לא מגיב

1. בדקו ב-Cloudflare שה-IP נכון.
2. SSH לשרת: `ssh deploy@<ip>`.
3. בדקו `systemctl status nginx docker`.
4. בדקו `docker compose ps` (יש שירות עם Exit?).
5. בדקו `df -h` (דיסק מלא?).

### בקשות איטיות / 504

1. Grafana → Dashboard "API Latency".
2. בדקו slow queries: `SELECT * FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start;`
3. בדקו Redis: `docker compose exec redis redis-cli INFO stats`.
4. אם תקלת אפליקציה — `docker compose restart api worker`.

### Migration נכשלה

```bash
# בדיקה
ssh deploy@staging "cd /opt/catering-staging && docker compose run --rm api npm run migrate:status"

# rollback אחרון
ssh deploy@staging "cd /opt/catering-staging && docker compose run --rm api npm run migrate:down"
```

### תעודת TLS לא מתחדשת

```bash
ssh deploy@staging "sudo certbot certificates"
ssh deploy@staging "sudo certbot renew --dry-run"
# אם נכשל - בודקים את /var/log/letsencrypt/letsencrypt.log
```

### דיסק מתמלא

```bash
ssh deploy@staging "df -h && du -sh /var/lib/docker"
ssh deploy@staging "docker system prune -af --volumes"
# נקיון logs:
ssh deploy@staging "sudo journalctl --vacuum-time=7d"
```

### חסימת IP (rate limit)

```bash
# הסרת חסימה זמנית של nginx limit_req:
ssh deploy@staging "sudo systemctl reload nginx"

# fail2ban:
ssh deploy@staging "sudo fail2ban-client status sshd"
ssh deploy@staging "sudo fail2ban-client unban <ip>"
```

---

## גיבויים ושיחזור

### Postgres - גיבוי ידני

```bash
ssh deploy@staging \
  "pg_dump \"$DATABASE_URL\" | gzip > /tmp/staging-$(date +%F).sql.gz && \
   wrangler r2 object put catering-staging-backups/$(date +%F).sql.gz --file /tmp/staging-$(date +%F).sql.gz"
```

### Postgres - שחזור מ-R2

```bash
wrangler r2 object get catering-staging-backups/2026-05-17.sql.gz --file restore.sql.gz
gunzip -c restore.sql.gz | psql "$STAGING_DB_URL"
```

### R2 media - העתקה ל-staging מ-production

```bash
rclone copy prod:catering-media staging:catering-staging-media \
  --transfers 8 --checkers 16
```

---

## עדכוני אבטחה

- כל יום ראשון: `apt list --upgradable` ובדיקה אם יש kernel CVE.
- כל חודש: `docker pull` לכל ה-base images וריבילד.
- חידוש `JWT_SECRET` כל 90 יום (יוצר login flush).

---

## נציגות / Escalation

| חומרה   | מי                  | ערוץ              |
|---------|---------------------|-------------------|
| info    | אוטומציה             | `#staging-alerts` |
| warning | on-call              | Slack + email     |
| critical| on-call + CTO        | Slack + טלפון     |

</div>
