# דוח תיקונים — Security Fixes (QA3)

> תאריך הפקה: 11/05/2026
> מבצע: agent-a2fb19a0abb722899
> כל הקבצים תחת `security-fixes/` (RTL).

---

## מבט-על

המסמך מסכם את 12 פגיעויות האבטחה ואת 8 הבלוקרים החוקיים שזוהו ב-QA3 ומציע
patches מוכנים ליישום + 5 חבילות חדשות. הכל מוכן להעתקה / החלה ב-worktrees המקוריים.

| # | קטגוריה | תיאור קצר | סטטוס | קבצים |
|---|----------|-----------|--------|-------|
| 1 | חוקי | מע"מ 17%→18% | מוכן | `patches/01-vat-*` |
| 2 | חוקי / פרטיות | זכות עיון + מחיקה (תיקון 13) | מוכן | `packages/privacy/` |
| 3 | חוקי | שימור 7 שנים ב-cold storage | מוכן | `cron/archival.ts` |
| 4 | חוקי / יציבות | iCount fallback ל-Green Invoice / Rivhit | מוכן | `packages/icount-fallback/` |
| 5 | חוקי | טפסי 106 / 102 / 126 Mai101 XML | מוכן | `packages/tax-reports/` |
| 6 | חוקי | Double opt-in + immutable consent log | מוכן | `packages/consent-ledger/` |
| 7 | אבטחה (P0) | JWT_SECRET="change-me" | מוכן | `patches/07-jwt-secret-strong.patch` |
| 8 | אבטחה (P0) | OTP Math.random + console.log | מוכן | `patches/08-otp-crypto-random.patch` |
| 9 | אבטחה (P0) | AES key hard-coded → KMS / HSM | מוכן | `packages/kms-client/` |
| 10 | אבטחה (P0) | Cookies ללא secure / httpOnly / sameSite | מוכן (template) | `patches/10-cookie-secure-template.patch` |
| 11 | אבטחה (P0) | JWT 7 ימים → 15 דקות + refresh | מוכן | `patches/11-jwt-15min-refresh.patch` |
| 12 | אבטחה (P0) | 2FA חובה למנהלים | מוכן | `patches/12-2fa-mandatory-admin.patch` |
| 13 | אבטחה (P0) | Cardcom zero-PCI | מוכן | `patches/13-cardcom-zero-pci.patch` |
| 14 | אבטחה (P0) | XSS ב-marketing templates | מוכן | `patches/14-marketing-xss-dompurify.patch` |

---

## 1. מע"מ 17% → 18%

**רציונל חוקי:** חוק התכנית הכלכלית לשנת 2025 העלה את שיעור המע"מ ל-18% החל מ-01/01/2025.

**מה תוקן:**
- `agent-a31b566159e7cc878/finance-docs/.env.example`: `VAT_RATE=0.17` → `VAT_RATE=0.18`.
- `agent-accb121134afd7c1a/packages/integrations/icount/src/types/index.ts`:
  - שורה 55 — קומנט `VATType.STANDARD` עודכן ל-"18%".
  - שורה 91 — `vatRate.default(17)` → `default(18)`.
- מסמך `patches/01-vat-global-grep-instructions.md` כולל פקודות grep ל-Bash ול-PowerShell לאיתור התרחשויות נוספות בכל הריפו, יחד עם טבלת המרה.

**קבצים:**
- `security-fixes/patches/01-vat-finance-docs-env.patch`
- `security-fixes/patches/01-vat-icount-types.patch`
- `security-fixes/patches/01-vat-global-grep-instructions.md`

---

## 2. זכות עיון / מחיקה — תיקון 13 (8/2025)

**רציונל חוקי:** תיקון 13 לחוק הגנת הפרטיות, שנכנס לתוקף ב-08/2025, מחייב מימוש פעיל של הזכויות הבאות:
- סעיף 13 — זכות עיון (Subject Access Request).
- סעיף 14 — זכות מחיקה (Right to be Forgotten).
- חובת מינוי DPO ושימור audit-log.

**חבילה: `security-fixes/packages/privacy/`**
- `subjectAccessRequest.ts` — Express handler שמייצא JSON שלם עם CRM + Orders + Payments + AuditLog + Consents. בעל אכיפת self-or-DPO + audit log.
- `rightToErasure.ts` — מחיקה רכה + אנונימיזציה ב-AES sha256 hashes (משאיר רשומות שעליהן חובת שמירה חוקית — חשבוניות, מסים, 7 שנים).
- `PRIVACY-POLICY.md` — מסמך מדיניות פרטיות לאתר, RTL, כולל תקופות שימור, פרטי DPO, פרטי הרשות להגנת הפרטיות.
- `index.ts` + `package.json`.

---

## 3. שימור 7 שנים ב-cold storage R2

**רציונל חוקי:** סעיף 25 לפקודת מס הכנסה + סעיף 130 לחוק מע"מ דורשים שמירת מסמכים פיננסיים 7 שנים.

**קובץ: `security-fixes/cron/archival.ts`**
- מעביר רשומות בנות > 12 חודשים ל-Cloudflare R2 (gzip + sha256 checksum).
- מוחק רשומות > 7 שנים מ-R2.
- תומך ב-`--dry-run`. מקבל מערך `ArchivableTable` כדי שיתאים לכל מודל Prisma.

---

## 4. iCount Fallback

**חבילה: `security-fixes/packages/icount-fallback/`**
- `ResilientInvoiceClient`: מנסה iCount → Green Invoice → Rivhit.
- Circuit Breaker per-provider (5 כשלונות = 60 שניות פתוח).
- Exponential backoff (200/400/800 ms).
- שומר ב-IntegrationLog איזה ספק הצליח.

---

## 5. טפסי 106 / 102 / 126 בפורמט Mai101 XML

**חבילה: `security-fixes/packages/tax-reports/`**
- `form106.xml.ts` — דו"ח שכר שנתי לעובד (שדות, סכומים באגורות, תאריכי YYYYMMDD).
- `form102.xml.ts` — דיווח חודשי על ניכויים (מס הכנסה, ביטוח לאומי, מס בריאות).
- `form126.xml.ts` — סיכום שנתי לכלל העובדים (כולל סיכומי שכר ותשלומים אגרגטיביים).

הפורמט תואם למפרט רשות המסים `Mai101 v2025.1`.

---

## 6. Marketing consent — double opt-in + immutable log

**רציונל חוקי:** סעיף 30א לחוק התקשורת ("חוק הספאם") דורש הסכמה מפורשת מתועדת לפני שיווק.

**חבילה: `security-fixes/packages/consent-ledger/`**
- `ConsentLedger.requestConsent` — שולח מייל אישור עם token חד-פעמי (24 שעות).
- `confirmConsent` — אישור בקליק.
- `withdrawConsent` — one-click unsubscribe.
- **Immutable hash-chain log:** כל רשומה כוללת `prevHash` ו-`hash = sha256(serialize(entry))`. אי-אפשר לערוך רשומה ישנה בלי לשבור את השרשרת. `verifyChain` מאמת.

---

## 7. JWT_SECRET חזק

**Patch:** `security-fixes/patches/07-jwt-secret-strong.patch`
- מחליף `"change-me"` ב-placeholder שגורם ל-boot להיכשל אם לא הוחלף.
- מוסיף הוראת ייצור: `openssl rand -hex 32`.
- מוסיף `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL=15m`, `JWT_REFRESH_TTL=7d`.
- כולל קוד boot-check לסירוב להפעיל אם הסוד חלש.

---

## 8. OTP cryptographically secure + הסרת console.log

**Patch:** `security-fixes/patches/08-otp-crypto-random.patch`
- `Math.random()` → `crypto.randomInt(100000, 1_000_000)`.
- הסרת `console.log` שחושף את ה-OTP בלוגים.
- הוספת `import crypto from 'node:crypto'`.

---

## 9. KMS / HSM Wrapper

**חבילה: `security-fixes/packages/kms-client/`**
- API אחיד — `encrypt() / decrypt() / reencrypt()` עם envelope-encryption.
- 3 backends: AWS KMS, GCP KMS, HashiCorp Vault Transit.
- AES-256-GCM עבור DEK; KEK בכספת בלבד.
- Plaintext DEK נמחק (zero-fill) אחרי שימוש.

---

## 10. Cookies — secure / httpOnly / sameSite

**Patch (template):** `security-fixes/patches/10-cookie-secure-template.patch`
- helper מרכזי `setSessionCookie`/`clearSessionCookie` עם `httpOnly: true`, `secure: production`, `sameSite: 'strict'`.
- הוראות `app.set('trust proxy', 1)` בפרודקשן.
- פקודות grep לאיתור כל קריאות `res.cookie(` הקיימות.

> שים לב: סריקת ה-worktrees לא איתרה שימוש פעיל ב-`res.cookie` בקוד מקור — רק ב-`node_modules`. ה-patch מספק תבנית מוכנה ליישום בקבצים שייווצרו בעת מעבר ל-cookie-based sessions (פרק 11).

---

## 11. JWT 7d → 15min + Refresh Token

**Patch:** `security-fixes/patches/11-jwt-15min-refresh.patch`
- `signAccessToken` — 15 דקות, sign עם `JWT_SECRET`.
- `signRefreshToken` — 7 ימים, sign עם `JWT_REFRESH_SECRET` (מפתח נפרד!), עם `tokenId` (jti).
- Endpoint `POST /auth/refresh` שמאמת ב-DB (revocable).
- `POST /auth/logout` שמוחק token + מחזיק blacklist.

---

## 12. 2FA חובה למנהלים

**Patch:** `security-fixes/patches/12-2fa-mandatory-admin.patch`
- Prisma fields: `twoFactorEnabled`, `twoFactorSecret`, `twoFactorBackupCodes[]`.
- `enforce2FARequirement`: לתפקידים `ADMIN | HR | MANAGER` חייב להיות 2FA.
- Login flow: דורש TOTP אם פעיל; חוסם אם תפקיד מנהלי + 2FA לא מוגדר → מחזיר `TWO_FACTOR_SETUP_REQUIRED`.
- helpers ב-`services/totp.ts` עם `otplib`.

---

## 13. Cardcom Zero-PCI

**Patch:** `security-fixes/patches/13-cardcom-zero-pci.patch`
- `TokenizeInputSchema` עודכן:
  - הוסר `cardNumber`, `cvv`, `expiryMonth`, `expiryYear`.
  - הוסף `lowProfileToken` (token מ-iframe LowProfile).
  - `.strict()` — אוסר שדות נוספים.
  - `.refine()` runtime guard נגד הזרקת שדות אסורים.
- העברה ל-PCI-DSS SAQ-A.

---

## 14. Marketing XSS — DOMPurify + escape

**Patch:** `security-fixes/patches/14-marketing-xss-dompurify.patch`
- `renderTemplate` עכשיו:
  - מבצע `escapeHtml` על כל merge field כברירת מחדל.
  - שדות שמתחילים ב-`raw_` עוברים `DOMPurify.sanitize` עם whitelist קטן (b, i, a, br, p, span, ul, ol, li).
  - הפלט הסופי עובר `DOMPurify.sanitize` עם FORBID_TAGS על script/style/iframe וגם FORBID_ATTR על onerror/onclick וכו'.
- dependency חדש: `isomorphic-dompurify`.

---

## הוראות יישום כלליות

1. **VAT/חוקי:** להריץ patches על הקבצים שלהם, ולסרוק עם `01-vat-global-grep-instructions.md` למקרים נוספים.
2. **חבילות חדשות:**
   - להעתיק `security-fixes/packages/<name>/` ל-`packages/` ב-monorepo המתאים.
   - `npm install` בכל חבילה (ה-deps רשומים ב-`package.json`).
   - לחבר ל-app: `import { ... } from '@security-fixes/<name>'`.
3. **ENV:** לעדכן `.env.example` ובסביבת CI/CD לפי patches #7, #11. **חובה** להריץ `openssl rand -hex 32` פעמיים (JWT_SECRET, JWT_REFRESH_SECRET).
4. **DB migrations:** patch #12 מציע שדות חדשים ב-Prisma. ליצור migration:
   ```bash
   npx prisma migrate dev --name add-2fa-fields
   ```
5. **בדיקות:** אחרי שכל ה-patches הוחלו, להריץ:
   - smoke test ל-XSS (patch #14).
   - יחידה: בדיקת `verifyChain` ב-ConsentLedger.
   - אינטגרציה: end-to-end SAR + Erasure ב-staging.

---

## הערות אחרונות

- כל ה-patches בפורמט unified diff ויכולים להיות מוחלים עם `git apply patches/NN-*.patch` מ-root של הריפו המתאים (יש להתאים נתיב).
- ה-Patches שלא הסתבקו על קבצים קיימים (10) מוגדרים כ-template; מקום היישום הוגדר במפורש.
- כל הקבצים נכתבו ב-TypeScript עם `strict` בדעת.
- העברית RTL במסמכים ובהערות; השמות הטכניים באנגלית כדי לתאם לכלי הפיתוח.
