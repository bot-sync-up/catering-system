<div dir="rtl" lang="he">

# רשימת מוכנות ל-Launch (Pre-Launch Checklist)

> כל פריט חייב להיות מסומן V ובאחריות של בעלים. אסור להעלות production לפני שכל הקריטיים סומנו.

## A. תשתית (Infrastructure)

- [ ] **A1**. כל ה-ENV vars מוגדרות ב-Vault / AWS SM (אין placeholders `__SET_ME__`)
- [ ] **A2**. `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `AES_KEY`, `NEXTAUTH_SECRET` נכנסו וסובבו פעם אחת
- [ ] **A3**. Postgres 16 מותקן, replica streaming פעיל
- [ ] **A4**. Redis 7 persistence AOF + RDB פעיל
- [ ] **A5**. WAL archive עובד ב-S3 (קובץ אחרון < 5 דק')
- [ ] **A6**. תעודות SSL (Let's Encrypt) auto-renew נבדק (`certbot renew --dry-run`)
- [ ] **A7**. Cloudflare DNS משויך, proxy=on על כל subdomain
- [ ] **A8**. NGINX security headers - HSTS, CSP, X-Frame, XCTO - אומתו עם `securityheaders.com` (A+)
- [ ] **A9**. ה-k8s cluster רץ עם 3 worker nodes לפחות (HA)
- [ ] **A10**. HPA פעיל לכל deployment

## B. אבטחה (Security)

- [ ] **B1**. כל ה-secrets ב-Vault. אין `.env` ב-Git (`gitleaks` עבר)
- [ ] **B2**. `npm audit --prod --audit-level=high` - 0 התראות
- [ ] **B3**. Trivy fs + image - 0 CRITICAL
- [ ] **B4**. Semgrep + CodeQL - 0 high
- [ ] **B5**. RBAC: 4 תפקידים (admin/manager/staff/customer) - נבדק עם integration tests
- [ ] **B6**. 2FA חובה לכל admin user (אכוף ב-NextAuth callback)
- [ ] **B7**. Rate limiting: 30 RPS למשתמש, 5 RPM ל-/login (NGINX + middleware)
- [ ] **B8**. SQL injection: ORM only, אסור `$queryRaw` ללא `Prisma.sql`
- [ ] **B9**. XSS: CSP מאופשר, `dangerouslySetInnerHTML` מסומן ב-ESLint
- [ ] **B10**. CSRF: tokens ב-state-changing endpoints
- [ ] **B11**. PII בטבלת `customers` מוצפן ב-AES (Israeli ID, phone)
- [ ] **B12**. logs לא מכילים secrets (Pino redact)
- [ ] **B13**. ניהול sessions: rotating refresh, max 5 active
- [ ] **B14**. Login attempt lockout אחרי 5 כשלונות (15 דק')

## C. נתונים וגיבויים

- [ ] **C1**. PostgreSQL במקום sql.js בכל אפליקציה
- [ ] **C2**. 24 migrations מאוחדים ב-`deployment/migrations/merged/`
- [ ] **C3**. `prisma migrate deploy` עובר על shadow DB
- [ ] **C4**. backup-postgres.sh רץ אוטומטית ב-cron, יומי 03:00 UTC
- [ ] **C5**. backup-redis.sh רץ אוטומטית, כל שעה
- [ ] **C6**. אימות backup שבועי (verify-restore.sh) ירוק
- [ ] **C7**. PITR נבדק - שחזור לנקודה לפני 1 שעה הצליח
- [ ] **C8**. lifecycle policy ב-bucket מופעל (יומי 30, שבועי 12, חודשי 7 שנים)
- [ ] **C9**. S3 bucket private, public access blocked
- [ ] **C10**. backup encryption (age) - מפתח identity ב-Vault, public ב-deploy

## D. ניטור (Monitoring)

- [ ] **D1**. Prometheus scraping את כל ה-20 apps + worker (200 OK ב-targets)
- [ ] **D2**. Grafana 3 dashboards פעילים: System, Business, Errors
- [ ] **D3**. Loki receiving logs מכל ה-pods
- [ ] **D4**. Sentry DSN פעיל בכל app, source maps עולים ב-CI
- [ ] **D5**. Uptime Kuma מנטר 5 endpoints קריטיים, status page פומבי
- [ ] **D6**. Alert routing: critical -> PagerDuty, warning -> Slack
- [ ] **D7**. כל alert ב-`platform.yml` נבדק (חיקוי + ack)
- [ ] **D8**. `/api/health` deep check בכל app: DB ping + Redis ping + version
- [ ] **D9**. RED metrics (Rate/Errors/Duration) זמינים בכל app
- [ ] **D10**. SLO dashboards: error budget burn rate

## E. ביצועים

- [ ] **E1**. k6 ordering-flow עבר עם p95<500ms, error<1%
- [ ] **E2**. k6 payment-flow עבר עם p95<700ms
- [ ] **E3**. Lighthouse score >90 mobile על כל app ציבורי
- [ ] **E4**. Redis caching מופעל ל-hot keys (menu, profile, geo)
- [ ] **E5**. DB indexes audit עבר (אין seq scan > 5x idx scan על טבלאות > 100k שורות)
- [ ] **E6**. CDN: assets `_next/static` cached 7d
- [ ] **E7**. כל `<img>` הוחלף ב-`next/image`
- [ ] **E8**. Bundle size כל app < 250kb gzipped (initial)
- [ ] **E9**. ISR/SSG לעמודים סטטיים

## F. תשלומים ועסקיים

- [ ] **F1**. iCount production token פעיל, חשבונות מתבצעים בהצלחה (sandbox -> live)
- [ ] **F2**. Cardcom production terminal פעיל, charge נסיוני עבר
- [ ] **F3**. fallback בין iCount ל-Cardcom נבדק
- [ ] **F4**. Webhooks חתומים (HMAC) + idempotency keys
- [ ] **F5**. PCI-DSS scope minimization (אין card numbers ב-DB - tokens בלבד)
- [ ] **F6**. Refund flow נבדק
- [ ] **F7**. חשבוניות נשלחות אוטומטית במייל + נשמרות ב-S3 (7 שנים)

## G. תקשורת ולקוחות

- [ ] **G1**. WhatsApp Business API verified ע"י Meta
- [ ] **G2**. WhatsApp templates approved (order_confirmation, delivery, receipt)
- [ ] **G3**. SMS provider (Twilio / mailgun) פעיל
- [ ] **G4**. Email DKIM + SPF + DMARC pass
- [ ] **G5**. Push notifications (FCM / APNs) - keys ב-Vault, certificate validity > 6m

## H. GDPR / רגולציה

- [ ] **H1**. Privacy Policy + Terms of Service מפורסמים, גישה מ-footer
- [ ] **H2**. Cookie banner (granular - analytics/marketing) פעיל
- [ ] **H3**. "Right to be forgotten" - endpoint `/api/account/delete` מוחק PII תוך 30d
- [ ] **H4**. Data export - `/api/account/export` מחזיר ZIP של JSON
- [ ] **H5**. Audit log על כל admin action (יישמר 7 שנים)
- [ ] **H6**. רשם מאגרי מידע - דווח לרשות להגנת הפרטיות
- [ ] **H7**. עיבוד תשלומים תואם PCI-DSS SAQ-A
- [ ] **H8**. Israeli ID hashed + encrypted at rest

## I. תהליכי תפעול

- [ ] **I1**. CI ירוק על main + develop
- [ ] **I2**. Staging deploy אוטומטי ב-push ל-develop
- [ ] **I3**. Production deploy דורש manual approval ב-GitHub environment
- [ ] **I4**. Pre-deploy backup רץ אוטומטית
- [ ] **I5**. Rollback מתועד ב-`migrations/ROLLBACK.md`, נוסה
- [ ] **I6**. Runbook עודכן (`deployment/RUNBOOK.md`) - תרגול on-call עבר
- [ ] **I7**. Status page פעיל (status.example.com)
- [ ] **I8**. PagerDuty schedule מוגדר ל-2 שבועות קדימה
- [ ] **I9**. On-call runbook עבר תרגול drill (game day)
- [ ] **I10**. Incident post-mortem template קיים

## J. UX / נגישות

- [ ] **J1**. כל הטקסט בעברית (RTL `<html dir="rtl">`)
- [ ] **J2**. אין hard-coded strings ב-JSX - i18n מלא
- [ ] **J3**. WCAG 2.1 AA - axe automated check נקי
- [ ] **J4**. Mobile-first - נבדק iPhone 12 + Samsung A52
- [ ] **J5**. PWA: manifest, service worker, install prompt
- [ ] **J6**. dark mode toggle עובד
- [ ] **J7**. פונט Heebo נטען (no FOUT)
- [ ] **J8**. אייקונים accessible (aria-label על כל IconButton)

---

## חתימה

| תפקיד | שם | תאריך |
|---|---|---|
| CTO | ___________ | ___ |
| DevOps Lead | ___________ | ___ |
| Security | ___________ | ___ |
| QA Lead | ___________ | ___ |
| Product | ___________ | ___ |

**אסור launch ללא 4 חתימות לפחות.**

</div>
