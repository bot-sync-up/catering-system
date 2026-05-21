# MASTER PATCHES — תיעוד כל ה-Patches על המונורפו המאוחד

<div dir="rtl">

מסמך זה מקבץ את **כל ה-patches** מסוכני האיטום (Sealing) והאינטגרציה (INT) שיש
ליישם על ה-monorepo המאוחד (`catering-monorepo/`). לכל patch מובא:

- **בעיה** (מה רע במצב הקיים)
- **חוק/תקן** שמחייב לתקן
- **קבצים+שורות** (איפה לחפש)
- **לפני / אחרי** (snippets)
- **חוזה אימות** (איך לבדוק שהיישום הצליח)

> מקור הנתונים: `agent-a3a11a087ec5a2e42` (security-fixes / sealing-3),
> `agent-ab161962f128a986d` (VAT migration), `agent-a4d9d36dec6e4234c`
> (audit-enforcement), `agent-a1c20bc1bd0cedd28` (cardcom-production),
> `agent-a7174d6ed144e4112` (icount-production), `agent-a58118e7d348be81b`
> (privacy-portal), `agent-ae12d76f8b5390803` (F1 monorepo).

---

## טבלת Patches בסקירה

| # | Patch | חומרה | קטגוריה | סקריפט |
|---|-------|--------|---------|--------|
| 1 | VAT 17% → 18% | P0 | חוקי | `apply-all-patches.sh` |
| 2 | JWT_SECRET חזק | P0 | אבטחה | `apply-all-patches.sh` |
| 3 | OTP crypto.randomInt | P0 | אבטחה | `apply-all-patches.sh` |
| 4 | Cookie Secure+HttpOnly+SameSite | P0 | אבטחה | `apply-all-patches.sh` |
| 5 | 2FA חובה למנהלים | P0 | אבטחה | `apply-all-patches.sh` |
| 6 | Cardcom zero-PCI | P0 | אבטחה+תאימות | `apply-all-patches.sh` |
| 7 | XSS sanitizer (DOMPurify) | P0 | אבטחה | `apply-all-patches.sh` |
| 8 | Audit middleware injection | P0 | תאימות | `inject-audit.ts` |
| 9 | Privacy endpoints integration | P0 | חוקי | `apply-all-patches.sh` |
| 10 | Migrate imports (`@aneh/*` → `@catering/*`) | P1 | refactor | `migrate-imports.ts` |

---

## 1. VAT 17% → 18%

### בעיה
שיעור המע"מ בישראל עלה מ-17% ל-18% החל מ-1/1/2025 (חוק ההסדרים).
הקוד הקיים מכיל קבועים `0.17`, `1.17`, `VAT_RATE = 17`, `vat: 17` בעשרות מקומות.

### חוק/תקן
- רשות המסים — הודעת מעבר לשיעור 18%, תוקף 1/1/2025.
- חוק מס ערך מוסף תשל"ו-1975.

### קבצים+שורות (דפוסים)
```
vat:\s*17                                 # JSON/TS objects
VAT_RATE[^0-9]*17                         # קבוע במספר שלם
\b0\.17\b                                 # שבר עשרוני
\b1\.17\b                                 # מקדם ברוטו מ-net
\*\s*0\.17                                # ביטוי כפל
מע"מ.*17%  /  מע״מ.*17%                  # מחרוזות ממשק עברית
vatRate\s*[:=]\s*17                       # שדות אובייקט
vat_rate\s*[:=]\s*17                      # snake_case (SQL)
VatRate\s*[:=]\s*17                       # PascalCase (C#)
```

### לפני
```ts
const VAT_RATE = 0.17;
const gross = net * 1.17;
const invoice = { vat: 17, vatRate: 0.17 };
```

### אחרי
```ts
import { getVATPercent, calcVATAmount, calcGrossFromNet } from '@catering/vat';

const VAT_PERCENT = getVATPercent(new Date());          // 18 מ-1/1/2025
const gross = calcGrossFromNet(net, new Date());
const invoice = {
  vat: getVATPercent(invoiceDate),
  vatRate: getVATRate(invoiceDate),
};
```

### SQL Migration
```sql
-- migrations/vat-migration.sql (מקור: agent-ab161962f128a986d)
BEGIN;
CREATE TABLE vat_migration_backup_invoice AS SELECT * FROM "Invoice"
  WHERE "vatRate" = 0.17 AND "invoiceDate" >= '2025-01-01';
UPDATE "Invoice" SET "vatRate" = 0.18
  WHERE "vatRate" = 0.17
    AND "invoiceDate" >= '2025-01-01'
    AND status NOT IN ('closed','paid','cancelled');
UPDATE "InvoiceLine" SET "vatRate" = 0.18
  WHERE "vatRate" = 0.17
    AND "createdAt" >= '2025-01-01';
ALTER TABLE "Invoice" ALTER COLUMN "vatRate" SET DEFAULT 0.18;
COMMIT;
```

### חוזה אימות
```bash
# 0 hits expected
grep -RnE '\b0\.17\b|\b1\.17\b|VAT_RATE\s*=\s*17|vat:\s*17' \
  --include='*.ts' --include='*.tsx' --include='*.sql' \
  apps/ packages/ services/
```

---

## 2. JWT_SECRET חזק (מ-`change-me`)

### בעיה
ב-`.env.example`, `docker-compose.yml`, ו-config files נמצאים secrets חלשים כמו
`JWT_SECRET=change-me`, `JWT_SECRET=secret`, `JWT_SECRET=12345678`. אם דליפה
מתרחשת, ההאקר חותם tokens בעצמו ועובד על המערכת.

### חוק/תקן
- OWASP A02:2021 — Cryptographic Failures.
- ISO 27001 A.10.1.2 — ניהול מפתחות.

### קבצים+שורות
```
JWT_SECRET=change-me
JWT_SECRET=secret
JWT_SECRET=changeme
JWT_SECRET="?(<32 chars)"?
ACCESS_TOKEN_SECRET=change-me
REFRESH_TOKEN_SECRET=secret
```

### לפני
```env
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
```

### אחרי
```env
# נוצר עם: openssl rand -base64 48
JWT_ACCESS_SECRET=__GENERATED_BY_apply-all-patches.sh__
JWT_REFRESH_SECRET=__GENERATED_BY_apply-all-patches.sh__
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
JWT_ALG=RS256
```

```ts
// services/*/src/bootstrap.ts
import { loadJwtConfigFromEnv, assertStrongSecret } from '@catering/jwt-config';
assertStrongSecret(process.env.JWT_ACCESS_SECRET!);
assertStrongSecret(process.env.JWT_REFRESH_SECRET!);
export const jwtConfig = loadJwtConfigFromEnv();
```

### חוזה אימות
```bash
grep -RnE 'JWT.*=.*(change[-_]?me|secret|password|12345)' .env* docker-compose*.yml
# צריך להחזיר 0
```

---

## 3. OTP `crypto.randomInt` (מ-`Math.random`)

### בעיה
`Math.random()` בנוי על מחולל פסבדו-אקראי לא קריפטוגרפי. דליפה של 2-3 ערכים
מאפשרת לחזות את הבא. מקובל לחשוב על זה כעל "שווה ערך ל-OTP בטקסט גלוי".

### חוק/תקן
- OWASP A02:2021.
- NIST SP 800-90A — Random Bit Generators.

### קבצים+שורות
```
Math\.random\(\)                          # שימוש כללי
Math\.floor\(Math\.random\(\)\s*\*\s*\d+\)  # OTP / verification code
Math\.random.*100000                      # OTP בן 6 ספרות
otp.*Math\.random
verificationCode.*Math\.random
resetToken.*Math\.random
```

### לפני
```ts
function genOTP() {
  return Math.floor(Math.random() * 900000) + 100000;
}
```

### אחרי
```ts
import { generateOTP, hashOTP, verifyOTP } from '@catering/otp';

const code = generateOTP();                    // crypto.randomInt(100000, 1000000)
const { hash, salt } = await hashOTP(code);    // לא לשמור clear-text
// ב-DB: store { hash, salt, expiresAt, attempts: 0, locked: false }
const ok = await verifyOTP(userInput, { hash, salt });  // timingSafeEqual
```

### חוזה אימות
```bash
# Math.random אסור בשירותי auth/payment
grep -Rn 'Math\.random' --include='*.ts' \
  services/auth services/orchestrator packages/auth
# 0 hits expected
```

---

## 4. Cookie Secure+HttpOnly+SameSite

### בעיה
Cookies של session/auth מוגדרות בלי דגלים — חשופות ל-XSS (קריאה דרך JS),
MITM (HTTP plain), ו-CSRF (שליחה cross-origin).

### חוק/תקן
- OWASP A05:2021 — Security Misconfiguration.
- RFC 6265 — HTTP State Management.

### קבצים+שורות
```
res\.cookie\([^,]+,\s*[^,]+\)$            # קריאה ללא options
res\.cookie\([^)]*\{[^}]*\}\)             # options object — בדוק שדגלים קיימים
Set-Cookie:.*(?<!Secure)                  # raw header חסר Secure
```

### לפני
```ts
res.cookie('session', token);
res.cookie('auth', token, { maxAge: 86400000 });
```

### אחרי
```ts
import { buildSetCookie, SESSION_COOKIE_PROFILE } from '@catering/cookies';

res.setHeader('Set-Cookie', buildSetCookie('session', token, {
  ...SESSION_COOKIE_PROFILE,            // Secure, HttpOnly, SameSite=Lax, Path=/
  maxAge: 86400,
  domain: process.env.COOKIE_DOMAIN,
}));
```

### חוזה אימות
```bash
grep -Rn 'res\.cookie(' --include='*.ts' apps/ services/ | grep -v 'buildSetCookie\|secure: true'
# 0 hits expected
```

---

## 5. 2FA חובה למנהלים

### בעיה
משתמשי `admin`, `finance`, `dpo` יכולים להיכנס עם סיסמה בלבד. דליפת סיסמת admin
פתחת את כל המערכת.

### חוק/תקן
- תקנות הגנת הפרטיות (אבטחת מידע) סעיף 16(ג) — אימות מרובה גורמים למשתמשים מורשים.
- SOC2 CC6.1.

### קבצים+שורות
```
app\.use\('/admin'                        # route mount של admin
router\.use\('/api/admin'                 # router mount
@Roles\(['"]admin['"]\)                   # decorator (NestJS)
req\.user\.role\s*===\s*['"]admin['"]     # role check ידני
```

### לפני
```ts
app.use('/admin', requireAuth, adminRouter);
```

### אחרי
```ts
import { require2FA } from '@catering/2fa-enforcement';

app.use('/admin', requireAuth, require2FA({ roles: ['admin','finance','dpo'] }), adminRouter);
app.use('/api/admin', requireAuth, require2FA({ roles: ['admin','finance','dpo'] }), adminApiRouter);
```

ב-login flow:
```ts
const user = await authenticatePassword(email, password);
const decision = await evaluate(user);
if (decision.requires2FA) {
  return res.redirect('/login/2fa');
}
```

### חוזה אימות
```bash
grep -Rn "app\.use\('/admin'" --include='*.ts' apps/ services/ | grep -v require2FA
# 0 hits expected
```

---

## 6. Cardcom Zero-PCI (TokenizeInputSchema)

### בעיה
קיימות נתיבי קוד שמקבלים PAN+CVV ישירות (`POST /api/charge` עם `cardNumber, cvv`).
זה אומר שה-server שלנו נכנס לטווח PCI-DSS, מה שכרוך ב-audit שנתי.

### חוק/תקן
- PCI-DSS 3.4 — PAN לא מאוחסן unencrypted.
- PCI-DSS 4.2 — never transmit PAN over messaging endpoints.

### קבצים+שורות
```
cardNumber\s*[,:]
pan\s*[,:]
cvv\s*[,:]
\bCVC\b
schema.*cardNumber
zod.*cardNumber
joi.*cardNumber
```

### לפני
```ts
const ChargeSchema = z.object({
  cardNumber: z.string().regex(/^\d{16}$/),
  cvv: z.string().length(3),
  expMonth: z.number(),
  expYear: z.number(),
  amount: z.number(),
});
```

### אחרי
```ts
import { TokenizeInputSchema, CardcomClient } from '@catering/cardcom-production';

// כל נתון רגיש (PAN/CVV) נאסף אך ורק בעמודי האירוח של Cardcom (LowProfile).
// ה-server מקבל אך ורק Token שכבר עבר tokenization.
const ChargeSchema = TokenizeInputSchema;   // { token, amount, currency, idempotencyKey }

router.post('/charge', validate(ChargeSchema), async (req, res) => {
  const result = await cardcomClient.charge({
    token: req.body.token,
    amount: req.body.amount,
    currency: 'ILS',
    idempotencyKey: req.body.idempotencyKey,
  });
  res.json(result);
});
```

### חוזה אימות
```bash
grep -RnE '\b(cardNumber|cvv|cvc|pan)\b\s*[:=]' --include='*.ts' --include='*.tsx' \
  apps/ services/ packages/
# 0 hits expected (חוץ מ-packages/security-fixes/packages/pci-validator/* שמבצע בדיקה)
```

---

## 7. XSS Sanitizer (DOMPurify)

### בעיה
תוכן משתמשים (comments, profile.bio, message.body) נשמר ב-DB ומוצג בלי סינון.
האקר יכול להזריק `<script>` שירוץ אצל משתמשים אחרים.

### חוק/תקן
- OWASP A03:2021 — Injection.
- חוק הגנת הפרטיות תשמ"א-1981 (סודיות נתונים).

### קבצים+שורות
```
dangerouslySetInnerHTML
innerHTML\s*=
\.html\(.*req\.
\.parse\(.*req\.
markdown.*sanitize\s*:\s*false
```

### לפני
```tsx
<div dangerouslySetInnerHTML={{ __html: comment.body }} />
```

### אחרי
```tsx
import { sanitizeRichText, sanitizeStripAll } from '@catering/xss-sanitizer';

// תוכן עשיר עם תגיות מותרות (b, i, a, p, ul, li)
<div dangerouslySetInnerHTML={{ __html: sanitizeRichText(comment.body) }} />

// תוכן טקסט נטו (chat, search, names)
<div>{sanitizeStripAll(message.body)}</div>
```

ב-bootstrap:
```ts
import DOMPurify from 'isomorphic-dompurify';
import { setPurify } from '@catering/xss-sanitizer';
setPurify(DOMPurify);
```

### חוזה אימות
```bash
grep -Rn 'dangerouslySetInnerHTML' --include='*.tsx' --include='*.ts' apps/ | grep -v sanitize
# 0 hits expected
```

---

## 8. Audit Middleware Injection לכל מודול

### בעיה
פעולות כתיבה ל-DB (create/update/delete) לא נרשמות ל-audit log. אין hash chain,
אין IP/userAgent, אין דרך לזהות tampering.

### חוק/תקן
- חוק הגנת הפרטיות סעיף 17ב — חובת רישום פעולות.
- SOC2 CC7.2.
- ISO 27001 A.12.4.

### קבצים+שורות
```
new\s+PrismaClient\s*\(                   # יצירת client
export\s+const\s+prisma\s*=               # singleton export
import\s+\{\s*prisma\s*\}\s+from          # consumer
```

### לפני
```ts
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
```

### אחרי
```ts
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { attachPrismaAuditMiddleware } from '@catering/audit-enforcement';

export const prisma = new PrismaClient();
attachPrismaAuditMiddleware(prisma, {
  getContext: () => auditContext.getStore() ?? { channel: 'system' },
  excludeModels: ['AuditLog', 'LoginAttempt', 'SensitiveAccess'],
});
```

ב-Express middleware:
```ts
import { auditContextMiddleware } from '@catering/audit-enforcement';
app.use(auditContextMiddleware());
```

### יישום אוטומטי
ראה `scripts/inject-audit.ts` — סורק את כל קבצי `prisma.ts` / `db.ts` / `server.ts`
ומזריק את ה-attach קריאה.

### חוזה אימות
```bash
grep -RlE 'new\s+PrismaClient\s*\(' --include='*.ts' apps/ services/ \
  | xargs grep -L 'attachPrismaAuditMiddleware\|auditMiddleware'
# 0 files expected
```

---

## 9. Privacy Endpoints Integration

### בעיה
חוק הגנת הפרטיות תיקון 13 (אוגוסט 2025) מחייב מענה לבקשות SAR / Erasure / Consent
תוך 30 יום. אם אין endpoint — חשיפה לקנס עד 3.2M₪.

### חוק/תקן
- חוק הגנת הפרטיות סעיפים 13 (זכות עיון), 14 (תיקון), 17ה (זכות להישכח).
- תיקון 13, פורסם 8/2024, תוקף 8/2025.

### קבצים+שורות
לזהות apps שמחסרים את הנתיבים:
```bash
ls apps/*/src/app/api/privacy/ 2>/dev/null
```

### לפני
אין `/api/privacy/*` ב-`apps/web`, `apps/customer-portal`, וכו'.

### אחרי
מוסיפים route handler שמחבר ל-app הקיים:
```ts
// apps/web/src/app/api/privacy/sar/request/route.ts
export { POST } from '@catering/privacy-portal/api/sar/request';
export { GET }  from '@catering/privacy-portal/api/sar/status';
```

או mount של ה-app הנפרד (`apps/privacy-portal`) כ-subdomain:
```nginx
# nginx.conf
server {
  server_name privacy.example.co.il;
  location / { proxy_pass http://privacy-portal:3030; }
}
```

ב-workers — להוסיף ל-`docker-compose.yml` / `k8s/`:
```yaml
privacy-worker-sar:      { image: privacy-portal:latest, command: ["pnpm", "worker:sar"] }
privacy-worker-erasure:  { image: privacy-portal:latest, command: ["pnpm", "worker:erasure"] }
```

### חוזה אימות
```bash
curl -X POST http://localhost:3030/api/privacy/sar/request \
  -H 'Content-Type: application/json' -d '{"email":"a@b.co.il"}'
# צריך להחזיר { token: "..." } או הודעה גנרית
```

---

## 10. Migrate Imports (`@aneh/*` → `@catering/*`)

### בעיה
חלק מה-apps יובאו מ-`@aneh-hashoel/*` (מפרויקט "ענה את השואל"), חלק מ-`@syncup/*`,
חלק מ-`@catering/*`. צריך לאחד תחת `@catering/*` כפי שמוגדר ב-MERGED-MANIFEST.

### קבצים+שורות
```
from\s+['"]@aneh-hashoel/
from\s+['"]@aneh/
from\s+['"]@syncup/
require\(['"]@aneh-hashoel/
```

### לפני
```ts
import { generateOTP } from '@aneh-hashoel/otp';
import { CardcomClient } from '@syncup/cardcom-production';
import { calcVATAmount } from '@syncup/vat-engine';
```

### אחרי
```ts
import { generateOTP } from '@catering/otp';
import { CardcomClient } from '@catering/cardcom-production';
import { calcVATAmount } from '@catering/vat';
```

### יישום אוטומטי
ראה `scripts/migrate-imports.ts`.

### טבלת מיפוי מלאה

| ישן | חדש |
|------|------|
| `@aneh-hashoel/auth` | `@catering/auth` |
| `@aneh-hashoel/audit-enforcement` | `@catering/audit-enforcement` |
| `@aneh-hashoel/otp` | `@catering/otp` |
| `@aneh-hashoel/jwt-config` | `@catering/jwt-config` |
| `@aneh-hashoel/cookies` | `@catering/cookies` |
| `@aneh-hashoel/2fa-enforcement` | `@catering/2fa-enforcement` |
| `@aneh-hashoel/xss-sanitizer` | `@catering/xss-sanitizer` |
| `@aneh-hashoel/pci-validator` | `@catering/pci-validator` |
| `@aneh-hashoel/kms-client` | `@catering/kms-client` |
| `@aneh-hashoel/privacy` | `@catering/privacy` |
| `@aneh-hashoel/consent-ledger` | `@catering/consent-ledger` |
| `@aneh-hashoel/archival` | `@catering/archival` |
| `@aneh-hashoel/invoicing-fallback` | `@catering/invoicing-fallback` |
| `@aneh-hashoel/tax-reports` | `@catering/tax-reports` |
| `@syncup/vat-engine` | `@catering/vat` |
| `@syncup/cardcom-production` | `@catering/cardcom-production` |
| `@syncup/icount-production` | `@catering/icount-production` |
| `@syncup/privacy-portal` | `@catering/privacy-portal` |

---

## סדר הפעלה מומלץ

```bash
# 1. גיבוי
cd <monorepo>
git checkout -b chore/apply-patches
git add . && git commit -m "snapshot before patches"

# 2. הרצת ה-batch
patches-apply/scripts/apply-all-patches.sh .

# 3. הזרקת audit middleware
ts-node patches-apply/scripts/inject-audit.ts .

# 4. מיגרציית imports
ts-node patches-apply/scripts/migrate-imports.ts .

# 5. אימות
ts-node patches-apply/verify-patches.ts .  > verify-report.json

# 6. בדיקת בנייה
pnpm install
pnpm typecheck
pnpm test

# 7. אם משהו השתבש
patches-apply/scripts/rollback.sh .
```

</div>
