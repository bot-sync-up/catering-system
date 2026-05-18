<div dir="rtl">

# Go-Live Checklist — מערכת ניהול קייטרינג

**מטרה**: רשימת בדיקות מקיפה לפני עלייה לפרודקשן. כל פריט חייב Owner, Deadline, Status.

**מקרא Status**: ⬜ פתוח | 🟡 בעבודה | 🟢 הושלם | 🔴 חסום

---

## A. Pre-Flight (טכני / תשתית)

| # | פריט | Owner | Deadline | Status |
|---|---|---|---|---|
| A01 | סביבות dev / staging / production מופרדות לחלוטין | DevOps Lead | D-30 | 🟡 |
| A02 | DNS + SSL (Let's Encrypt או רכישה) מותקנים ומחודשים אוטומטית | DevOps Lead | D-21 | ⬜ |
| A03 | CDN (Cloudflare/Fastly) מוגדר ומבחנים נטענים בו | DevOps Lead | D-14 | ⬜ |
| A04 | PostgreSQL Primary + Replica + Connection Pooler (PgBouncer) | DBA | D-21 | 🟡 |
| A05 | Redis ל-Cache + Session מותקן ומוגן בסיסמה | DevOps | D-14 | ⬜ |
| A06 | Object Storage (S3/MinIO) לקבצים, חתימה דיגיטלית, חשבוניות PDF | DevOps | D-21 | ⬜ |
| A07 | תור הודעות (RabbitMQ/SQS) פעיל לעבודות אסינכרוניות | Backend Lead | D-14 | ⬜ |
| A08 | בדיקת Health-Check על כל מיקרו-שירות (`/health`, `/ready`) | Backend Lead | D-21 | 🟡 |
| A09 | מערכת לוגים מרכזית (ELK / Loki / CloudWatch) | DevOps | D-14 | ⬜ |
| A10 | APM (Datadog / NewRelic / Grafana Tempo) | DevOps | D-14 | ⬜ |

---

## B. Compliance (רגולציה ישראל)

| # | פריט | Owner | Deadline | Status |
|---|---|---|---|---|
| B01 | מע"מ 18% — סריקת קוד מלאה והסרת כל הופעת 17% | Finance Lead | D-30 | 🔴 |
| B02 | ניהול חשבוניות לפי דרישת רשות המסים — מספור רציף, חתימה דיגיטלית | Finance Lead | D-21 | 🔴 |
| B03 | חיבור לחשבונית ירוקה / iCount בפרודקשן | Backend Lead | D-21 | 🔴 |
| B04 | טופס 102 / 126 (לאחר Phase 3 — Payroll) | Finance Lead | Phase 3 | ⬜ |
| B05 | תאימות חוק הגנת הפרטיות + רישום מאגר מידע | Legal | D-30 | ⬜ |
| B06 | הסכם משתמש (ToS) + מדיניות פרטיות בעברית | Legal | D-30 | ⬜ |
| B07 | WCAG 2.1 AA — תקן ישראלי 5568 (נגישות) | UX Lead | D-21 | 🔴 |
| B08 | הצהרת נגישות באתר + טופס פניית נגיש | UX Lead | D-7 | ⬜ |
| B09 | תאימות PCI-DSS (אם נסלקים אשראי ישירות) | Security | D-14 | ⬜ |
| B10 | הסכמים מול ספקים חיצוניים חתומים (DPA) | Legal | D-14 | ⬜ |
| B11 | קופה רושמת מסונכרנת (אם רלוונטי) | Finance Lead | Phase 2 | ⬜ |

---

## C. Performance (ביצועים)

| # | פריט | Owner | Deadline | Status |
|---|---|---|---|---|
| C01 | Load testing — 200 משתמשים מקבילים, P95 < 1.5s | Performance | D-14 | ⬜ |
| C02 | Stress testing — שבירה ב-1000 משתמשים | Performance | D-14 | ⬜ |
| C03 | DB Indexing — בדיקת EXPLAIN ANALYZE על 20 השאילתות הכבדות | DBA | D-21 | 🟡 |
| C04 | N+1 queries — סריקה ותיקון | Backend | D-21 | 🟡 |
| C05 | Bundle size FE < 250KB gzipped (initial) | Frontend Lead | D-14 | ⬜ |
| C06 | Lazy loading למודולים משניים | Frontend Lead | D-14 | 🟡 |
| C07 | Image optimization (WebP, ResponsiveSrcset) | Frontend | D-14 | ⬜ |
| C08 | Caching headers + ETag לקבצים סטטיים | DevOps | D-7 | ⬜ |
| C09 | Time-to-Interactive בנייד < 3s ב-3G סימולציה | Frontend Lead | D-7 | ⬜ |
| C10 | Database backup לא משפיע על ביצועי קריאה (Replica) | DBA | D-14 | ⬜ |

---

## D. Security (אבטחה)

| # | פריט | Owner | Deadline | Status |
|---|---|---|---|---|
| D01 | OWASP Top 10 — סריקה ידנית + Snyk/Semgrep | Security Lead | D-21 | 🟡 |
| D02 | Pen-test חיצוני (ספק עצמאי) | CISO | D-14 | ⬜ |
| D03 | Secret rotation — לא קיימים secrets ב-Git | Security | D-30 | 🟡 |
| D04 | Rate limiting על כל ה-endpoints הציבוריים | Backend | D-14 | ⬜ |
| D05 | CSRF Tokens בכל form mutating | Frontend | D-14 | ⬜ |
| D06 | CSP Header מוגדר ומבחנים עוברים | Security | D-7 | ⬜ |
| D07 | HSTS + Secure Cookies + SameSite=Strict | DevOps | D-7 | ⬜ |
| D08 | WAF פעיל (Cloudflare WAF/AWS WAF) | DevOps | D-14 | ⬜ |
| D09 | Audit log על כל פעולה רגישה (CRUD על משתמשים, כספים) | Backend | D-21 | 🟡 |
| D10 | 2FA חובה לאדמינים | Security | D-14 | ⬜ |
| D11 | RBAC נבדק על כל endpoint (לא רק UI) | Security | D-14 | 🟡 |
| D12 | Backups מוצפנים at-rest + in-transit | DevOps | D-14 | ⬜ |
| D13 | Disaster Recovery Drill מתועד (RTO < 4h, RPO < 15min) | DevOps | D-7 | ⬜ |

---

## E. Operations (תפעול)

| # | פריט | Owner | Deadline | Status |
|---|---|---|---|---|
| E01 | Runbook לתקלות נפוצות מתועד | Ops Lead | D-7 | ⬜ |
| E02 | On-Call rotation מוגדר (PagerDuty/OpsGenie) | Ops Lead | D-7 | ⬜ |
| E03 | SLA פנימי מוגדר (Uptime 99.5% להתחלה) | Product | D-30 | ⬜ |
| E04 | Status page ציבורי (status.example.co.il) | DevOps | D-7 | ⬜ |
| E05 | Alerting rules (CPU > 80%, Latency > 2s, ErrorRate > 1%) | DevOps | D-14 | 🟡 |
| E06 | Support ticket system (Zendesk/Freshdesk/Jira SD) | Support Lead | D-14 | ⬜ |
| E07 | תסריטי תמיכה ב-L1 / L2 / L3 | Support Lead | D-7 | ⬜ |
| E08 | FAQ ומסמכי משתמש בעברית פורסמו | Product | D-14 | ⬜ |
| E09 | סרטוני הדרכה (Onboarding) הוקלטו | Product | D-7 | ⬜ |
| E10 | Communication plan ללקוחות (Email/SMS/WhatsApp) | Marketing | D-14 | ⬜ |
| E11 | Change management — תהליך release מתועד | Ops | D-21 | ⬜ |

---

## F. Data (נתונים)

| # | פריט | Owner | Deadline | Status |
|---|---|---|---|---|
| F01 | Migration script מהמערכת הקיימת — נבדק ב-staging פעמיים | DBA | D-21 | 🟡 |
| F02 | Data Validation Suite — אימות יושרה אחרי הגירה | DBA | D-14 | ⬜ |
| F03 | Rollback DB Snapshot — נלקח שעה לפני Go-Live | DBA | D-Day | ⬜ |
| F04 | Seed data לבדיקות בפרודקשן (Smoke tests) | QA | D-7 | ⬜ |
| F05 | GDPR/הגנת פרטיות — נוהל מחיקת לקוח | Legal+Backend | D-14 | ⬜ |
| F06 | Export ללקוחות (Right to portability) | Backend | D-14 | ⬜ |
| F07 | תאימות גיבויים — לפחות 3 רמות (יומי 7, שבועי 4, חודשי 12) | DBA | D-14 | ⬜ |
| F08 | בדיקת שחזור (Restore Drill) על נתונים אמיתיים | DBA | D-7 | ⬜ |
| F09 | אנונימיזציה של נתוני production ב-staging | DBA | D-30 | ⬜ |
| F10 | Schema migrations הם idempotent ו-reversible | Backend | D-21 | 🟡 |

---

## G. QA & Testing

| # | פריט | Owner | Deadline | Status |
|---|---|---|---|---|
| G01 | Test coverage ב-Core flow ≥ 70% | QA Lead | D-21 | 🔴 |
| G02 | E2E suite מריץ Critical Path ירוק 5 ימים ברצף | QA Lead | D-7 | ⬜ |
| G03 | בדיקות RTL ידניות (שדות, חשבוניות, PDF) | QA | D-14 | ⬜ |
| G04 | בדיקות נגישות (ידני + Axe + Lighthouse) | QA + UX | D-14 | ⬜ |
| G05 | Cross-browser (Chrome, Edge, Safari, Mobile Safari) | QA | D-14 | ⬜ |
| G06 | בדיקת חישובי מע"מ 18% על תרחישי חשבוניות אמיתיים | Finance + QA | D-21 | 🔴 |
| G07 | UAT עם 2-3 לקוחות פיילוט — חתימה רשמית | Product | D-7 | ⬜ |
| G08 | Regression Suite אוטומטי על pre-prod מדי לילה | QA Lead | D-14 | ⬜ |

---

## H. Launch Day Specific

| # | פריט | Owner | Deadline | Status |
|---|---|---|---|---|
| H01 | War Room booked + ZOOM/Slack channel פעיל | Launch Owner | D-3 | ⬜ |
| H02 | All hands briefing — D-1 | Launch Owner | D-1 | ⬜ |
| H03 | Maintenance window הוכרז ללקוחות 7 ימים מראש | Marketing | D-7 | ⬜ |
| H04 | Rollback decision tree מתועד וחתום | Launch Owner | D-3 | ⬜ |
| H05 | Feature flags מוכנים לכיבוי מהיר | Backend | D-3 | ⬜ |
| H06 | Hypercare team מוגדר ל-72h ראשונות | Support Lead | D-1 | ⬜ |
| H07 | מוקד טלפוני מתוגבר ל-72h | Support Lead | D-1 | ⬜ |

---

## סיכום

- **סה"כ פריטים**: 71
- **🔴 חסומים קריטיים**: 4 (B01, B02, B03, B07, G01, G06)
- **🟡 בעבודה**: ~15
- **⬜ פתוחים**: ~52

**הגדרת Done לכל פריט**: מאושר בכתב על ידי Owner + ראיה מצורפת (screenshot/test report/document).

</div>
