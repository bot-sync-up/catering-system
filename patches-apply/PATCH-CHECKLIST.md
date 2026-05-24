# PATCH-CHECKLIST — בדיקה ידנית לאחר אוטומציה

<div dir="rtl">

מסמך זה הוא checklist ידני שיש להריץ **אחרי** הפעלת `apply-all-patches.sh`,
`inject-audit.ts`, `migrate-imports.ts` ו-`verify-patches.ts`. הוא מתמקד בדברים
שאוטומציה לא יכולה לכסות במלואה: מיגרציות DB, secrets בענן, infra, מבצעי
ביקורת, ועוד.

---

## שלב 0 — לפני הכל

- [ ] `git status` — נקי, או על branch ייעודי (`chore/apply-patches`).
- [ ] גיבוי DB: `pg_dump -F c $DATABASE_URL > pre-patches.dump`.
- [ ] גיבוי `.env` של כל סביבה (dev/staging/prod) ל-vault.
- [ ] חברי צוות שעובדים על ה-repo עודכנו (slack/email).

---

## שלב 1 — VAT 17% → 18%

### אוטומציה
- [x] `apply-all-patches.sh` החליף `0.17 → 0.18`, `1.17 → 1.18`, `vat: 17 → 18`.
- [ ] `verify-patches.ts` מחזיר `vat-17.status = PASS`.

### ידני
- [ ] עיון בלוג `.patches-applied.log` ב-VAT — האם המספרים סבירים? (כל apps/billing, packages/contracts).
- [ ] **חשבוניות פתוחות** (`status = 'open'`): להחליט אם להוציא מחדש ב-18% (תלוי מועד הוצאה ללקוח).
  - [ ] בדיקה: `SELECT COUNT(*) FROM "Invoice" WHERE status='open' AND "invoiceDate" >= '2025-01-01' AND "vatRate"=0.17;`
- [ ] **חשבוניות סגורות לפני 1/1/2025**: לא לגעת.
- [ ] הרצת SQL migration: `psql $DATABASE_URL -f migrations/vat-migration.sql`.
- [ ] אימות sums: השוואת `vat_migration_backup_invoice.SUM(total)` ל-`Invoice.SUM(total)` חדש.
- [ ] **תצוגות UI**: לבדוק checkout, invoice PDF, dashboard sums.
- [ ] **רואה חשבון**: לוודא דיווח חודשי (טופס 102) מציג 18%.
- [ ] **iCount/GreenInvoice**: לעדכן את הגדרת ה-default vatRate בלוח הבקרה שלהם.
- [ ] **Cache** (Redis/CDN): pflush של חישובים שמורים.
- [ ] **Receipts (קבלות)** שכבר הוצאו עם 17% — לא לגעת. רק חדשות יקבלו 18%.

---

## שלב 2 — JWT_SECRET חזק

### אוטומציה
- [x] `.env.example` עודכן ל-`JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET` placeholders.
- [ ] `verify-patches.ts` מחזיר `jwt-weak.status = PASS`.

### ידני (CRITICAL)
- [ ] **dev/local**: יצירת secrets חדשים:
  ```bash
  echo "JWT_ACCESS_SECRET=$(openssl rand -base64 48)" >> .env.local
  echo "JWT_REFRESH_SECRET=$(openssl rand -base64 48)" >> .env.local
  ```
- [ ] **staging**: עדכון Vault / AWS Secrets Manager / Doppler.
- [ ] **production**: rotation של secrets — **לאחר** שכל ה-services נטענו עם הקריאה החדשה.
- [ ] **invalidate sessions קיימים**: שינוי ה-secret מאלץ logout לכולם — לוודא שהמשתמשים מודעים.
- [ ] בדיקה: `curl /api/auth/me` עם token ישן — צריך להחזיר 401.
- [ ] עדכון CI/CD: `JWT_ACCESS_SECRET` ב-GitHub Actions secrets, GitLab Variables וכו'.
- [ ] **RSA migration (אופציונלי)**: מעבר מ-HS256 ל-RS256 עם key-pair (`jwt-config` תומך).

---

## שלב 3 — OTP crypto.randomInt

### אוטומציה
- [ ] `apply-all-patches.sh` לא משנה אוטומטית (דורש שינוי import). רק warns.
- [ ] רשימת hits ב-`.patches-applied.log`.

### ידני
- [ ] לכל hit ב-`Math.random` בקונטקסט OTP/auth — להחליף ב-`generateOTP()` מ-`@catering/otp`:
  ```ts
  - const code = Math.floor(Math.random() * 900000) + 100000;
  + import { generateOTP } from '@catering/otp';
  + const code = generateOTP();
  ```
- [ ] **DB schema**: לוודא ש-OTP נשמר עם `{ hash, salt, expiresAt, attempts, locked }`, לא clear-text.
- [ ] **rate limiting**: 5 ניסיונות, 15 דק' lockout.
- [ ] בדיקת flow מלא: signup → SMS/email OTP → verify → success.
- [ ] בדיקה: OTP פג תוקף אחרי 5 דקות.
- [ ] CI test: לוודא ש-`detectMathRandomUsage` רץ ב-pre-commit.

---

## שלב 4 — Cookie Secure+HttpOnly+SameSite

### אוטומציה
- [ ] `apply-all-patches.sh` לא משנה אוטומטית (חתימה משתנה). רק warns.

### ידני
- [ ] לכל `res.cookie(...)` — להחליף ב-`buildSetCookie(...)`:
  ```ts
  - res.cookie('session', token);
  + res.setHeader('Set-Cookie', buildSetCookie('session', token, SESSION_COOKIE_PROFILE));
  ```
- [ ] **בדיקה ב-DevTools**: כל cookie מוצגת עם `Secure`, `HttpOnly`, `SameSite=Lax`.
- [ ] **domain**: לבדוק שה-`COOKIE_DOMAIN` ב-`.env` תואם לפרודקשן (`.example.co.il`).
- [ ] **subdomain**: אם יש app בענן + privacy.example.co.il — לוודא ש-cookies זמינות בשניהם.
- [ ] בדיקת cross-site: cookie לא נשלחת מ-`evil.com` → `app.example.co.il` (SameSite=Lax).
- [ ] **CI test**: `auditCookieHeader(response)` רץ אוטומטית על endpoints קריטיים.

---

## שלב 5 — 2FA חובה למנהלים

### אוטומציה
- [ ] רק warns (require2FA דורש middleware chain).

### ידני
- [ ] לכל `app.use('/admin', ...)` — להוסיף `require2FA({ roles: ['admin','finance','dpo'] })`.
- [ ] **רישום 2FA למשתמשי admin קיימים**: שליחת מייל "אתם חייבים להירשם ל-2FA תוך 7 ימים".
- [ ] **TOTP secret**: לוודא שמוצפן ב-DB עם KMS (לא בטקסט גלוי).
- [ ] **backup codes**: לאפשר ייצוא של 10 קודי גיבוי.
- [ ] בדיקה: admin בלי 2FA → 403 + redirect ל-`/login/2fa`.
- [ ] בדיקה: admin עם 2FA → גישה רגילה.
- [ ] **בדיקת recovery**: מה קורה אם admin איבד את הטלפון? (sysadmin reset ב-DB).
- [ ] **audit**: לוודא ש-`evaluate()` רושם ל-AuditLog בכל ניסיון.

---

## שלב 6 — Cardcom Zero-PCI

### אוטומציה
- [ ] רק warns (החלפה דורשת שינוי schema).

### ידני (CRITICAL)
- [ ] **כל endpoint שמקבל cardNumber/cvv** — להחליף ב-`TokenizeInputSchema`:
  ```ts
  - const { cardNumber, cvv, expMonth, expYear } = req.body;
  + const { token } = TokenizeInputSchema.parse(req.body);
  ```
- [ ] **UI**: להחליף שדות card → iframe של Cardcom LowProfile.
- [ ] **Webhook**: לוודא חתימה (HMAC-SHA256 + replay window 5 דק').
- [ ] **3DS**: לבדוק flow של אימות חזק (PSD2 SCA).
- [ ] **DB**: לוודא שאין שדה `cardNumber` ב-schema הקיים. אם יש — מחיקה/הצפנה (KMS) של היסטוריה.
- [ ] **logs**: לוודא ש-`pci-validator` רץ על כל log לפני כתיבה.
- [ ] **PCI-DSS scope**: לתעד ב-`docs/security/PCI-SCOPE.md` שאנחנו ב-SAQ-A (לא נוגעים ב-PAN).
- [ ] **Cardcom credentials**: ב-Vault, לא ב-`.env` של מאגר.
- [ ] **Idempotency**: כל `charge()` מקבל `idempotencyKey` ייחודי (orderId).
- [ ] **refund flow**: לבדוק `client.refund({ tranzactionId, partialSum })`.

---

## שלב 7 — XSS Sanitizer

### אוטומציה
- [ ] רק warns.

### ידני
- [ ] **כל `dangerouslySetInnerHTML`** — לעטוף ב-`sanitizeRichText()` או `sanitizeStripAll()`:
  ```tsx
  - <div dangerouslySetInnerHTML={{ __html: comment.body }} />
  + <div dangerouslySetInnerHTML={{ __html: sanitizeRichText(comment.body) }} />
  ```
- [ ] **bootstrap**: לוודא `setPurify(DOMPurify)` נקרא פעם אחת ב-app init.
- [ ] **server-side rendering**: לוודא ש-`isomorphic-dompurify` עובד גם ב-Node (לא רק browser).
- [ ] **mail templates**: כל שדה משתמש (name, message) עובר sanitize לפני שילוב ב-HTML.
- [ ] **PDF templates**: handlebars partials עוטפים ב-sanitize.
- [ ] **CSP headers** (`Content-Security-Policy`): להגביל `script-src 'self'`.
- [ ] בדיקה: שמירת comment עם `<script>alert(1)</script>` → אין alert ב-rendering.

---

## שלב 8 — Audit Middleware

### אוטומציה
- [x] `inject-audit.ts` מזריק `attachPrismaAuditMiddleware` לכל `prisma.ts`.
- [x] מזריק `auditContextMiddleware` ל-Express `app.ts`.
- [ ] `verify-patches.ts` מחזיר `audit-missing.status = PASS`.

### ידני
- [ ] **Prisma schema**: לוודא ש-`AuditLog`, `LoginAttempt`, `SensitiveAccess` קיימים. אם לא:
  ```bash
  # העתק מ-packages/audit-enforcement/INTEGRATION-GUIDE.md
  npx prisma migrate dev --name add_audit_tables
  ```
- [ ] **SQL triggers + RLS + retention**:
  ```bash
  psql $DATABASE_URL -f packages/audit-enforcement/src/db/triggers.sql
  psql $DATABASE_URL -f packages/audit-enforcement/src/db/rls.sql
  psql $DATABASE_URL -f packages/audit-enforcement/src/db/retention.sql
  ```
- [ ] **AsyncLocalStorage context** — לוודא ש-`auditContext` מועבר נכון בין middleware ל-Prisma.
- [ ] **excludeModels**: AuditLog עצמו לא נכנס לרקורסיה.
- [ ] בדיקה: יצירת user חדש → AuditLog row עם `action='create'`, `model='User'`.
- [ ] בדיקה: hash chain תקין (`prevHash` של row N = `hash` של row N-1).
- [ ] **retention**: cron יומי שמשייט rows > 7 שנים ל-cold storage.
- [ ] **Admin UI**: עמוד חיפוש ב-`apps/admin/audit-log` עובד.

---

## שלב 9 — Privacy Endpoints

### אוטומציה
- [ ] רק warns אם apps חסרים endpoints.

### ידני
- [ ] **apps/privacy-portal קיים** ב-monorepo. אם לא:
  ```bash
  cp -r /worktrees/agent-a58118e7d348be81b/apps/privacy-portal apps/
  ```
- [ ] **Nginx**: subdomain `privacy.example.co.il` מועבר ל-`privacy-portal:3030`.
- [ ] **Workers ב-docker-compose / k8s**:
  ```yaml
  privacy-worker-sar:     { command: ["pnpm","worker:sar"] }
  privacy-worker-erasure: { command: ["pnpm","worker:erasure"] }
  ```
- [ ] **mailer**: `MAIL_FROM`, `SMTP_*` ב-`.env` של privacy-portal.
- [ ] **artifacts storage**: R2/S3 bucket ל-ZIP files של SAR responses.
- [ ] בדיקה: `POST /api/privacy/sar/request` → מקבל confirmation email.
- [ ] בדיקה: `GET /api/privacy/sar/status/:token` → מצב הבקשה.
- [ ] בדיקה: `GET /api/privacy/sar/download/:token` → מחזיר ZIP.
- [ ] בדיקה: `POST /api/privacy/erasure/request` + approve → cascade anonymization.
- [ ] בדיקה: חשבוניות לא נמחקו (7 שנים שמירה).
- [ ] **DPO**: לוודא שמייל DPO מקבל התראה על כל בקשה.
- [ ] **SLA cron**: התראה ב-day 25 על SAR שלא נענה.
- [ ] **קישור במדיניות פרטיות** של האתר הראשי.
- [ ] **double opt-in** לכל consent — לבדוק מייל אישור.

---

## שלב 10 — Imports Migration

### אוטומציה
- [x] `migrate-imports.ts` מחליף `@aneh-hashoel/*` ו-`@syncup/*` → `@catering/*`.
- [ ] `verify-patches.ts` מחזיר `old-imports.status = PASS`.

### ידני
- [ ] **package.json**: לוודא ש-`@catering/*` ב-workspace (`pnpm-workspace.yaml`).
- [ ] **tsconfig.base.json paths**: `@catering/*` מוגדר ל-`packages/*/src`.
- [ ] **pnpm install**: רץ נקי.
- [ ] **pnpm typecheck**: 0 שגיאות.
- [ ] **pnpm test**: כל ה-tests עוברים.
- [ ] **CI**: build success.

---

## שלב 11 — תאימות מערכת

- [ ] `pnpm install` רץ ללא שגיאות.
- [ ] `pnpm typecheck` רץ נקי.
- [ ] `pnpm lint` רץ נקי.
- [ ] `pnpm test` עובר.
- [ ] `pnpm orchestrator:test` (saga workflows) עובר.
- [ ] `pnpm db:generate` רץ.
- [ ] `pnpm db:migrate` רץ (אחרי גיבוי).
- [ ] `pnpm db:seed` רץ.
- [ ] `docker compose up -d` מעלה את כל ה-services.
- [ ] `curl http://localhost/health` → 200.

---

## שלב 12 — Smoke tests פרודקשן-ראדי

- [ ] **Auth flow**: signup → login → 2FA (אם admin) → cookie מוגדרת נכון.
- [ ] **Payment flow**: עגלה → LowProfile iframe → token → charge → invoice ב-iCount.
- [ ] **VAT calc**: עגלה של ₪100 → ₪118 ברוטו (לא ₪117).
- [ ] **Audit**: יצירת order חדש → AuditLog row.
- [ ] **Privacy**: בקשת SAR → מייל הגיע → ZIP מורד.
- [ ] **XSS**: comment עם payload → לא מתבצע בדפדפן.
- [ ] **Rate limit**: 6 ניסיונות login עם סיסמה שגויה → 429.
- [ ] **2FA bypass**: admin בלי 2FA → 403.

---

## שלב 13 — Observability

- [ ] **Sentry**: errors מ-services מגיעים.
- [ ] **Grafana dashboards**: VAT compliance, audit log volume, privacy SLA, cardcom success rate.
- [ ] **Datadog APM**: latency של critical endpoints < 200ms p95.
- [ ] **Alerts**: 
  - [ ] SAR > 25 ימים פתוח → page DPO.
  - [ ] failed login > 10/min מ-IP יחיד → page security.
  - [ ] Cardcom error rate > 5% → page on-call.
  - [ ] Audit hash chain mismatch → page security IMMEDIATELY.

---

## שלב 14 — תיעוד וסגירה

- [ ] עדכון `CHANGELOG.md` ב-monorepo.
- [ ] עדכון `docs/launch/GO-LIVE-CHECKLIST.md`.
- [ ] PR description עם summary של כל ה-patches.
- [ ] **Tag git**: `git tag v1.0.0-patches-applied`.
- [ ] **Slack/email לצוות**: "patches יושמו, monorepo במצב 1.0 RC".
- [ ] **המתנה 48 שעות** של monitoring לפני promote ל-prod.

---

## תקלות נפוצות

| תסמין | סיבה | פתרון |
|--------|------|--------|
| `Cannot find module @catering/vat` | tsconfig paths חסר | להוסיף ל-`tsconfig.base.json` paths |
| `Math.random` עדיין נמצא ב-OTP | החלפה ידנית לא בוצעה | grep + replace ב-IDE |
| Cardcom returns 9XX | webhook URL לא נכון / firewall | לבדוק `webhookUrl` ב-config |
| audit_log חסר rows | middleware לא attached | לוודא `attachPrismaAuditMiddleware` רץ |
| privacy SAR נתקע | worker לא רץ | `pnpm worker:sar` או docker service |
| JWT 401 בכל בקשה | secret שונה בין services | סנכרון של env בכל ה-services |
| VAT עדיין 17% ב-PDF | template לא עודכן | לבדוק `pdf-templates/invoice.hbs` |
| 2FA דורש לכולם | roles config | `require2FA({ roles: ['admin'] })` |

---

## קבצים שיש לסקור ידנית

קבצים שהאוטומציה לא תיגע בהם — חובה לבדוק ידנית:

- `prisma/schema.prisma` — לוודא 84 entities + AuditLog + LoginAttempt + SensitiveAccess.
- `pnpm-workspace.yaml` — packages חדשים.
- `tsconfig.base.json` — paths.
- `turbo.json` — globalEnv עם כל ה-secrets.
- `docker-compose.yml` — services חדשים (privacy workers, audit workers).
- `production-pack/k8s/*` — deployments + secrets + configmaps.
- `nginx.conf` — subdomain privacy.
- `docs/launch/RISK-REGISTER.md` — להוסיף סיכוני הפעלה חדשים.
- `docs/launch/GO-LIVE-CHECKLIST.md` — להוסיף את כל ה-checklist הזה.

</div>
