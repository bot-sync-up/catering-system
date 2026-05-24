# FIXES-APPLIED — תיקוני P0

<div dir="rtl">

מסמך זה מרכז את כל ה-packages שנבנו כאן, את הבעיה שכל אחד פותר, ואיפה ליישם
בכל worktree/פרויקט במונורפו. כל package מובא כקוד TypeScript עם Zod + vitest.

## טבלת סיכום

| # | Package | קטגוריה | בעיה שנפתרה | חוק/תקן | יישום |
|---|---------|---------|------------|---------|-------|
| 1 | vat | חוקי ישראל | חישוב מע"מ קשיח 17% | רשות המסים — 18% מ-1.1.2025 | כל מערכות החיוב |
| 2 | privacy | חוקי ישראל | SAR + מחיקה לא ממומשים | חוק הגנת הפרטיות סעיפים 13, 14 | API לקוחות + DB |
| 3 | archival | חוקי ישראל | חשבוניות נמחקות לפני 7 שנים | פקודת מס הכנסה | cron לילי |
| 4 | invoicing-fallback | חוקי ישראל | תלות בספק חשבוניות בודד | חובת הוצאת חשבונית | שירות חיוב |
| 5 | tax-reports | חוקי ישראל | אין דיווח 106/102/126 | רשות המסים — Mai101 | פירולים שנתי+חודשי |
| 6 | consent-ledger | חוקי ישראל | רישום לדיוור בלי double-opt-in | חוק התקשורת תיקון 40 | רישום משתמשים |
| 7 | jwt-config | אבטחה P0 | secrets חלשים, אין refresh | OWASP A02 | services backend |
| 8 | otp | אבטחה P0 | Math.random לסודות | OWASP A02 | login + reset password |
| 9 | kms-client | אבטחה P0 | מפתחות הצפנה ב-env | OWASP A02 | הצפנת PII ב-DB |
| 10 | cookies | אבטחה P0 | חסר Secure/HttpOnly/SameSite | OWASP A05 | session/auth cookies |
| 11 | 2fa-enforcement | אבטחה P0 | admin login בלי 2FA | תקנות אבטחת מידע סעיף 16(ג) | middleware backend |
| 12 | pci-validator | אבטחה P0 | חשש שמספרי כרטיס בלוגים | PCI-DSS 3.4 | CI + middleware |
| 13 | xss-sanitizer | אבטחה P0 | input של משתמש לא מסונן | OWASP A03 | כל endpoint שמקבל HTML |

---

## 1. packages/vat — חישוב מע"מ ישראלי

**הבעיה**: ה-codebase כולל קבועים כמו `const VAT = 0.17` שלא משתנים אוטומטית
לשיעור החדש 18% של 2025.

**פתרון**: `getVatRate(date)` עם טבלה היסטורית + `calcVat`/`withVat`/`stripVat`.

**איפה ליישם**:
- ב-`backend/billing/*` — להחליף כל `* 1.17` ו-`* 0.17`.
- ב-`apps/web/checkout/*` — תצוגת מע"מ בעגלה.
- ב-`pdf-templates/invoice.hbs` — תבנית חשבונית.
- ב-`infra/sql/migrations/*` — סקריפט עדכון רשומות `draft` בלבד (ראה `migration.md`).

## 2. packages/privacy — SAR + Right To Erasure

**הבעיה**: בקשת לקוח "תמחקו אותי" / "תשלחו לי את כל המידע עליי" לא נתמכת.
חוק הגנת הפרטיות מחייב מענה תוך 30 יום.

**פתרון**:
- `subjectAccessRequest.ts` — workflow מאומת עם דדליין.
- `rightToErasure.ts` — אנונימיזציה דטרמיניסטית במקום מחיקה כשיש חובת שמירה.
- `PRIVACY-POLICY.md` — תבנית בעברית RTL לפרסום ב-`/privacy-policy`.

**איפה ליישם**:
- API ייעודי `/api/privacy/sar` ו-`/api/privacy/erasure`.
- Cron יומי שמתריע על SAR שלא נענו תוך 25 יום.
- Hook ב-`users.delete()` שמפעיל `eraseSubject` עם `DEFAULT_ISRAEL_POLICIES`.

## 3. packages/archival — Cron ארכיון R2 7 שנים

**הבעיה**: רשומות חשבוניות/לוגים נמחקות מוקדם מדי או נשארות ב-hot storage יקר.

**פתרון**: `runArchivalCron` עם שני שלבים — hot→cold אחרי שנה, cold→deleted אחרי 7 שנים.

**איפה ליישם**:
- Worker Cloudflare / cron node שרץ בלילה.
- מימוש `ArchivalSource` עבור כל טבלה רגישה (invoices, audit_logs, documents).
- חיבור `ColdStorage` ל-R2 / S3 Glacier.

## 4. packages/invoicing-fallback — חשבוניות עם fallback

**הבעיה**: כשiCount או GreenInvoice נופלים — לקוח לא מקבל חשבונית
ואנחנו בעבירה על חוק.

**פתרון**: `issueInvoice(req, providers, audit)` מנסה לפי הסדר ורושם כל ניסיון.

**איפה ליישם**:
- `backend/billing/services/InvoiceService.ts` — להחליף את הקריאה הישירה ל-iCount
  ב-`issueInvoice` עם שלושת הספקים.
- adapters: `iCountAdapter`, `greenInvoiceAdapter`, `rivhitAdapter` — שיממשו את `InvoiceProvider`.

## 5. packages/tax-reports — טופסי 106/102/126

**הבעיה**: דיווח ידני לרשות המסים. סיכון לעיכובים וקנסות.

**פתרון**: רינדור XML של שלושת הטפסים בפורמט Mai101.

**איפה ליישם**:
- `services/payroll/exporters/` — קריאה ל-`renderForm106/126` חודשי / חצי-שנתי.
- `services/finance/exporters/` — `renderForm102` חודשי עד ה-15.
- Endpoint שמייצר את הקובץ להעלאה לאתר רשות המסים.

## 6. packages/consent-ledger — double-opt-in

**הבעיה**: רישום לרשימת תפוצה בלי אישור כפול = הפרת חוק התקשורת
(עד 1,000 ש"ח לכל מקבל).

**פתרון**: workflow של `requestOptIn` → מייל אישור → `confirmOptIn`,
plus hash-chain שלא ניתן לזיוף.

**איפה ליישם**:
- בכל מקום שמשתמש מסמן "אני רוצה לקבל עדכונים".
- `verifyChain` ב-cron יומי לאיתור עבירות מוקדם.
- Endpoint `/unsubscribe/<token>` שקורא ל-`optOut`.

## 7. packages/jwt-config — JWT חזק

**הבעיה**:
- secrets כמו `"changeme"` או 12 תווים.
- access token עם TTL של שעות → אם דולף, האקר עובד עליו זמן רב.
- אין refresh token rotation.

**פתרון**:
- `assertStrongSecret` — בדיקת אורך + entropy + blacklist.
- `loadJwtConfigFromEnv` — נכשל בהדלקה אם הסביבה חלשה.
- TTL 15 דקות access, 7 ימים refresh עם rotation.

**איפה ליישם**:
- בכל service backend בקריאת bootstrap.
- להריץ `generateSecret()` פעם אחת ולשמור ב-secrets manager (Vault / AWS Secrets).

## 8. packages/otp — OTP מאובטח

**הבעיה**: שימוש ב-`Math.random()` ל-OTP — חשיפה מלאה אחרי כמה דגימות.

**פתרון**:
- `crypto.randomInt(100000, 1000000)` — 6 ספרות מאובטחות.
- hash + salt לשמירת OTP ב-DB (לא לשמור clear-text).
- timingSafeEqual להשוואה.
- 5 ניסיונות + נעילה 15 דקות.

**איפה ליישם**:
- כל מסך אימות SMS / מייל.
- script CI שמריץ `detectMathRandomUsage` על כל הקוד.

## 9. packages/kms-client — KMS Wrapper

**הבעיה**: מפתחות הצפנה ב-env vars / ב-DB בטקסט.

**פתרון**: envelope encryption — מפתח master ב-KMS, data keys נוצרים פר ערך.

**איפה ליישם**:
- שדות PII רגישים: `users.id_number`, `users.bank_account`, `customers.tax_id`.
- ב-prod: `awsKmsBackend({ keyId: 'arn:aws:kms:...' })`.
- ב-dev: `new InMemoryKmsBackend()`.

## 10. packages/cookies — cookies בטוחות

**הבעיה**: cookies בלי Secure/HttpOnly/SameSite פתוחות ל-XSS, MITM, CSRF.

**פתרון**: `buildSetCookie` עם defaults מחמירים + פרופילים מוכנים.

**איפה ליישם**:
- בכל express middleware של auth.
- בכל קריאה ל-`res.cookie(...)` — להחליף ב-`buildSetCookie`.
- ב-CI: `auditCookieHeader` על תגובות סינטטיות.

## 11. packages/2fa-enforcement — חסימת admin בלי 2FA

**הבעיה**: בעלי תפקיד admin יכולים להיכנס עם password בלבד.

**פתרון**: middleware שמחזיר 401/403 אם המשתמש לא רשם 2FA ואומת.

**איפה ליישם**:
- לפני כל route תחת `/admin/*`, `/api/admin/*`, `/finance/*`, `/dpo/*`.
- ב-login flow: לאחר password verification, לקרוא ל-`evaluate()`
  ולנתב ל-`/login/2fa` אם נדרש.

## 12. packages/pci-validator — בדיקת PAN/CVV

**הבעיה**: סכנה שמספרי כרטיס דולפים ללוגים / JWT claims / cache.

**פתרון**: Luhn + BIN ranges + סריקת objects רקורסיבית.

**איפה ליישם**:
- pre-commit hook על כל קבצי `*.log`, `*.json` ב-PR.
- middleware ב-API gateway: `assertPciSafe(req.body, 'request.body')`.
- בלוגר: לפני כל `info/error`, להריץ `scanObject` ולהחליף בערך masked.

## 13. packages/xss-sanitizer — Wrapper ל-DOMPurify

**הבעיה**: HTML משתמשים נשמר ומוצג בלי סינון = stored XSS.

**פתרון**: `sanitizeStripAll` / `sanitizeRichText` עם DOMPurify מוזרק.

**איפה ליישם**:
- בכל שמירת תוכן משתמש: comment, profile bio, message.
- ב-mail templates שמכניסים שדות משתמש.
- ב-PDF generation מתבניות.
- להזריק את `isomorphic-dompurify` ב-bootstrap: `setPurify(DOMPurify)`.

---

## בדיקות

כל package כולל tests עם vitest. מהרוט:

```bash
cd security-fixes
npm install
npm test
```

## פריסה לפי worktree

| Worktree | להתקין | קונפיג נוסף |
|----------|--------|--------------|
| `backend/billing` | vat, invoicing-fallback, archival | env: VAT_RATE_OVERRIDE? + spec לכל ספק |
| `backend/auth` | jwt-config, otp, 2fa-enforcement, cookies | env: JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, OTP_HASH_SALT |
| `backend/payroll` | tax-reports | סדר ייצוא: 102 חודשי, 126 חצי שנתי, 106 שנתי |
| `backend/payments` | pci-validator, kms-client | חבר ל-Vault Transit |
| `backend/api` | xss-sanitizer, cookies, 2fa-enforcement | הזרק DOMPurify ב-bootstrap |
| `backend/users` | privacy, consent-ledger | API חדש: /privacy/sar, /privacy/erasure |
| `infra/cron` | archival | schedule: 03:00 UTC כל לילה |

</div>
