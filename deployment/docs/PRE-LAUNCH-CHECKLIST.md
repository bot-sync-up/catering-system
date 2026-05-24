<div dir="rtl">

# Checklist לפני עלייה לאוויר

> סמן כל פריט. אל תעלה לאוויר עם פריטים פתוחים ב-block.

## אבטחה (12)

- [ ] **A1** כל הסודות נשמרים ב-Vault, אין `.env` בשרתי prod.
- [ ] **A2** Rotation אוטומטי הוגדר ל-JWT secret, DB password, webhook keys (כל 90 יום).
- [ ] **A3** TLS 1.2+ בלבד; ציון A ב-SSL Labs לכל subdomain (www, portal, admin).
- [ ] **A4** HSTS פעיל עם `includeSubDomains` ו-`preload`.
- [ ] **A5** CSP headers מוגדרים ונבדקו בלי דליפת `unsafe-eval` (admin) ו-`unsafe-inline` (admin).
- [ ] **A6** WAF/Rate-limit פעיל (nginx zones או Cloudflare).
- [ ] **A7** ה-admin subdomain מוגן ב-allow-list IP או VPN.
- [ ] **A8** Trivy scan עבר בלי CRITICAL/HIGH על ה-image-ים של prod.
- [ ] **A9** gitleaks היסטורי רץ — אין secrets ב-git.
- [ ] **A10** dependency audit נקי (`npm audit --audit-level=high`).
- [ ] **A11** הרשאות DB: gateway/worker עם user נפרד, לא super-user.
- [ ] **A12** Pentest חיצוני בוצע ב-30 הימים האחרונים, ממצאי HIGH+ נסגרו.

## תשתית (10)

- [ ] **I1** Docker compose prod עולה נקי משרת חדש (drill).
- [ ] **I2** HA: לפחות 2 instances של gateway ו-2 של next.
- [ ] **I3** Postgres עם `archive_mode=on` ו-WAL מועלה ל-R2.
- [ ] **I4** Redis עם persistence (AOF) + Sentinel/replica.
- [ ] **I5** DNS עם TTL = 300s לפני עלייה לאוויר (החלפה מהירה).
- [ ] **I6** Cloudflare/CDN בקונפיגורציה הסופית, cache rules נבדקו.
- [ ] **I7** משאבים: לפחות 30% headroom ב-CPU/RAM בשעות שיא צפויות.
- [ ] **I8** Log rotation מוגדר (Loki retention 30d).
- [ ] **I9** NTP/chrony פעיל בכל המכונות.
- [ ] **I10** Firewall: רק 80/443 פתוחים מבחוץ, SSH מוגבל ל-IP-ים מאושרים.

## גיבוי ושחזור (6)

- [ ] **B1** `backup-postgres.sh` רץ ב-cron יומי, מאומת ב-`verify.sh` שבועי.
- [ ] **B2** `backup-redis.sh` רץ כל 6 שעות.
- [ ] **B3** Restore drill הושלם — שחזור מלא תוך < 60 דקות.
- [ ] **B4** PITR נבדק — שחזור לנקודת זמן ספציפית מצליח.
- [ ] **B5** Off-site copies (R2) מוצפנות ב-GPG.
- [ ] **B6** RTO ≤ 1h, RPO ≤ 15min מתועדים ומאומתים.

## ניטור והתראות (8)

- [ ] **M1** Prometheus + Grafana + Loki פעילים בכל אזור.
- [ ] **M2** 3 dashboards (system/business/errors) נטענים בלי error.
- [ ] **M3** התראות (`alerts.yml`) מקושרות ל-PagerDuty/Slack.
- [ ] **M4** On-call rotation מוגדר עם 2 אנשים לפחות.
- [ ] **M5** מבחני התראה: HighCPU, PostgresDown, HighErrorRate — קיבלו עדכון.
- [ ] **M6** SLO: 99.9% uptime, p95 < 500ms מוגדרים ומדידים.
- [ ] **M7** Error tracking (Sentry/חלופה) מקבל events מ-gateway ו-next.
- [ ] **M8** לוגים מקבלים `trace_id` להצלבה בין שירותים.

## קוד ו-CI (6)

- [ ] **C1** CI ירוק על main, כולל matrix Node 20+22.
- [ ] **C2** Coverage > 70% בקוד עסקי קריטי (orders, payments).
- [ ] **C3** Feature flags מוגדרים לפיצ'רים חדשים (אפשרות kill-switch).
- [ ] **C4** Migrations מאומתות במצב reversible.
- [ ] **C5** Database seed לסביבת staging מעודכן.
- [ ] **C6** Conventional commits ו-changelog אוטומטי.

## עסקי ותוכן (6)

- [ ] **U1** מדיניות פרטיות + תנאי שימוש בעברית מאושרים משפטית.
- [ ] **U2** GDPR/חוק הגנת הפרטיות: זכויות מימוש (מחיקה/ייצוא) קיימות.
- [ ] **U3** דפי שגיאה (404/500) בעברית עם ניווט חזרה.
- [ ] **U4** מיילים טרנזקציוניים בעברית, RTL, נבדקו ב-Outlook/Gmail/Apple Mail.
- [ ] **U5** SMS דרך Twilio נבדק על מספרי isr (+972).
- [ ] **U6** מערכת תשלומים נבדקה end-to-end עם כרטיס אמיתי (ולא רק sandbox).

## תפעול ועל-call (5)

- [ ] **O1** Runbook (`RUNBOOK.md`) מעודכן ונקרא ע"י כל מי שב-on-call.
- [ ] **O2** דרישות חוקיות לחשבוניות (מע"מ, חשבונית מס) — בדיקה עם רו"ח.
- [ ] **O3** SLA למשתמשים מפורסם (`SLA.md`).
- [ ] **O4** Status page חיצוני (status.example.co.il) מוגדר.
- [ ] **O5** Communication plan לתקלות (Twitter/Email/SMS).

</div>
