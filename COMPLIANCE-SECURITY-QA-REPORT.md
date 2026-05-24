<div dir="rtl">

# דוח QA — ציות חוקי ישראלי ואבטחת מידע
## מערכת קייטרינג רב-מודולרית (24 worktrees)

| נושא | ערך |
|---|---|
| **תאריך הדוח** | 11/05/2026 |
| **סוקר** | QA Compliance & Security Agent |
| **גרסה נסקרת** | branch `main` (snapshot היום) |
| **היקף** | 13 worktrees פונקציונליים מתוך 24 (תשתית, DB, Auth, Audit, HR, Payroll, חשבוניות, iCount, Cardcom, BI, פורטל לקוחות, CRM, שיווק) |
| **תוצאת קומפליאנס** | **לא עומד בדרישות לשחרור לפרודקשן** |
| **תוצאת אבטחה** | **חמור — קיימות חולשות קריטיות** |

---

## תקציר מנהלים

המערכת מציגה רמת הבשלה גבוהה במספר מודולים (Audit Log, Auth, iCount, Cardcom), אך **לא ניתן לשחרר לפרודקשן** במצבה הנוכחי בשל:

1. **ערכי ברירת מחדל לא חוקיים** — שיעור מע"מ 17% במקום 18% (השיעור התקף מ-1.1.2025).
2. **JWT_SECRET="change-me"** כברירת מחדל בקובץ `.env.example` של מודול החשבוניות — סיכון ייצור קטסטרופלי.
3. **OTP לפורטל לקוחות נוצר ב-`Math.random()`** — צפיה למתקיף.
4. **AES key נשמר כ-ENV hex** ללא KMS/HSM — סטייה מהמלצות רמ"ט וכן מהנחיית הגנת הפרטיות.
5. **אין מימוש זכות עיון/מחיקה** לפי חוק הגנת הפרטיות, התשמ"א-1981 (תיקון 13, 8/2025).
6. **2FA אינו נכפה על מנהלים** — opt-in בלבד.
7. **JWT 7 ימים** במודול ה-HR ללא refresh token — מנוגד ל-best practice.

---

## מתודולוגיה

הסקירה נערכה ע"י קריאת קוד סטטית ב-13 worktrees, כולל:
- `prisma/schema.prisma`, מיגרציות SQL.
- שכבת קריפטוגרפיה (`password.ts`, `aes.ts`, `tokens.ts`).
- חוקיות PCN874, מספרי הקצאה, מע"מ.
- middlewares: `authenticate`, `rateLimit`, `securityHeaders`.
- שירותי תשלום (CardCom) — בדיקת PCI scope.
- מודולי שיווק — בדיקת consent ו-opt-out.

---

# חלק א' — ציות חוקי ישראלי

## 1. מודל ישראל ומספרי הקצאה (חוק רשות המסים)

**worktree:** `agent-accb121134afd7c1a` (iCount integration)
**קובץ:** `packages/integrations/icount/src/services/allocation-number.service.ts`

### מה נמצא

```ts
const ALLOCATION_THRESHOLDS: Record<number, number> = {
  2024: 25_000,
  2025: 20_000,
  2026: 10_000,
  2027: 5_000,
};
```

### הערכה
| תנאי | סטטוס |
|---|---|
| ספי 2024 (25,000 ₪) | תקין |
| ספי 2025 (20,000 ₪) | תקין |
| ספי 2026 (10,000 ₪) | תקין |
| ספי 2027 (5,000 ₪) | תקין |
| API call ל-`/allocation_number/get` של iCount | מומש |
| Validation לפני שליחה | קיים |
| **תיעוד פנימי בקוד שגוי** | "החל מ-2024 חובה לחשבונית מעל 5,000 ₪" — תיעוד שגוי! הסף ב-2024 הוא 25,000, לא 5,000. |
| **Fallback אם iCount נופל** | **חסר!** אין retry-with-different-provider או הזנה ידנית כשהשירות לא זמין |

### חסר
- **אין מנגנון fallback** כשרשות המסים/iCount לא זמין — חשבוניות לא יהיו תקפות.
- **אין שמירת ה-signature** מהאישור של רשות המסים לאורך זמן (יש שדה `signature` ב-response, אך אין שמירה ב-DB ב-schema).

---

## 2. תוכנה מאושרת 1346

**קובץ:** `packages/integrations/icount/src/types/index.ts:3`

```ts
/**
 * iCount integration - Core types
 * תואם לדרישות רשות המסים בישראל - תוכנה מאושרת 1346
 */
```

### הערכה
- מוצהר טקסטואלית בלבד.
- **חסר**: לא קיים מנגנון שמוודא במהלך runtime שהאישור 1346 בתוקף לחברה (מספר רישום ספציפי, תאריך תפוגה).
- **חסר**: אין declaration במסמך החשבונית הסופי שהוא הופק ע"י תוכנה 1346 כפי שדורש החוק (מספר 1346 + שם הספק).

---

## 3. מע"מ 17% ו-PCN874

### **כשל חמור**

**worktree:** `agent-a31b566159e7cc878` (חשבוניות)
**קובץ:** `src/lib/config.ts`

```ts
vatRate: Number(process.env.VAT_RATE ?? 0.17),
```

**קובץ:** `.env.example`
```
VAT_RATE=0.17
```

**worktree:** `agent-accb121134afd7c1a`
**קובץ:** `packages/integrations/icount/src/types/index.ts:54`
```ts
STANDARD = 'standard',     // מע"מ רגיל 17%
...
vatRate: z.number().min(0).max(100).default(17),
```

**שיעור המע"מ בישראל החל מ-1.1.2025 הוא 18%** — בכל המערכת ה-default הוא 17%. זה יוצר חשבוניות שגויות וחבות מס.

### PCN874 — מבנה אחיד
**קובץ:** `vat-report.service.ts:74` — מומש פורמט `A|B|...|Z`. **חסר תיקוף מבני** מול הפורמט הרשמי של רשות המסים (אורכים קבועים, padding נכון, תאריכים בפורמט YYYYMMDD בלבד, וכו'). הקוד מבצע `padDate/padAmount/padNumber` כלליים ללא בדיקת תאימות.

---

## 4. שמירת מסמכים 7 שנים

**worktree:** `agent-a5e9ec7d29999be9c` (Audit Log)

### חיובי
- מוגדר `AUDIT_RETENTION_DAYS` (ברירת מחדל 2555 ימים = 7 שנים, לפי README).
- טריגרים DDL חוסמים `UPDATE/DELETE/TRUNCATE` על `audit_logs`.
- RLS פעיל ומכפה — רק `GENERAL_ADMIN` יכול לקרוא.
- חתימת timestamp שרת-side (לא מאמינים ללקוח).

### חסר / סיכון
- **אין retention enforcement פעיל** — לא מצאתי job/cron שמוודא שאין מחיקות פיזיות לפני 7 שנים. הטריגרים מונעים, אבל אין בדיקה מתוזמנת.
- **אין archival ל-WORM (Write-Once-Read-Many)** — שמירה רק בטבלת DB. במקרה של drop של ה-DB כל ההיסטוריה נעלמת. **חוק החשבונאי דורש שמירה לאחר 7 שנים גם בארכיון נפרד**.
- **חשבוניות**: לא מצאתי בקוד החשבוניות (`finance-docs`) מנגנון שמירת PDF/XML ל-7 שנים. ה-state machine מאפשר ביטול דרך CREDIT_NOTE (טוב), אבל אין הצהרת retention.

---

## 5. טופסי שכר (106, 102, 126) ומדרגות 2026

**worktree:** `agent-ab96ab384014c8442` (payroll)
**קובץ:** `src/schemas/index.js:270`

### מדרגות מס הכנסה 2026
```js
incomeTaxBrackets: [
  { upTo: 7010,    rate: 0.10 },
  { upTo: 10060,   rate: 0.14 },
  { upTo: 16150,   rate: 0.20 },
  { upTo: 22440,   rate: 0.31 },
  { upTo: 46690,   rate: 0.35 },
  { upTo: 60130,   rate: 0.47 },
  { upTo: Infinity, rate: 0.50 },
],
taxCreditPointValue: 247,
```

### הערכה
- **בתיעוד הקוד מוצהר במפורש "הערכה"** — לא ערכים רשמיים של רשות המסים.
- ערך נקודת זיכוי 247 ש"ח חודשי — קרוב לערך 2025 אך לא מאומת ל-2026.
- שכר מינימום 5,880 ₪ — מוצהר "הערכה".

### דוחות 102/126
- **דוח 102** ו-**דוח 126** מופקים כ-PDF בלבד.
- **חסר**: ייצוא בפורמט הרשמי `Mai101` / `XML` של רשות המסים והמוסד לביטוח לאומי. PDF לבדו אינו תחליף להגשה האלקטרונית.
- **חסר**: טופס 126 רבעוני — אין pipeline אוטומטי לדיווח רבעוני.

### טופס 106
- מופק כ-PDF.
- **חסר**: תיק מעסיק (טופס 0102 / מספר תיק ניכויים) — בקוד אין שדה לכך.
- **חסר**: מספר תעודת זהות עם ספרת ביקורת בולידציה.

---

## 6. חוק הגנת הפרטיות, התשמ"א-1981 (תיקון 13, אוגוסט 2025)

### זכויות נושא המידע
| זכות | מומש? |
|---|---|
| זכות עיון (סעיף 13) | **לא מומש** — אין route `/me/export` או דומה |
| זכות תיקון (סעיף 14) | מסור — דרך CRM אבל ללא תיעוד קוגניציה |
| זכות מחיקה/הסרת מידע ("חוק יוסי") | **לא מומש** — אין account deletion flow ב-portal |
| הסכמה מפורשת לדיוור (חוק התקשורת תשמ"ב, סעיף 30א) | **חלקי** — שדות `consentEmail/SMS/WA` קיימים ב-Lead schema, אך אין תיעוד **מתי** ניתנה ההסכמה ו-**איך** (double opt-in?) |
| Unsubscribe נגיש | יש route בtracking.ts (route `unsubscribe`) |
| תיעוד הסרה למאגר | **חלקי** — `unsubscribedAt` נשמר, אך לא נשמר מקור ה-event ו-IP |
| רישום מאגר מידע אצל הרשם | **לא ניתן לאמת מקוד** — נושא ארגוני, חיצוני לקוד |
| DPO (Data Protection Officer) — חובה לארגון מעל סף | **לא ניתן לאמת מקוד** |
| Data Breach Notification (72h) | **אין מנגנון** — אין route/process המתעד אירוע ומפעיל התראה לרשם |

### Anonymization / Pseudonymization
- אין מנגנון anonymization של לקוחות אחרי תקופה.
- ב-Audit Log: PII (IP, User-Agent) נשמרים 7 שנים — **בעייתי** לפי PDP — צריך הצדקה ספציפית או anonymization אחרי תקופה קצרה יותר.

---

# חלק ב' — אבטחה

## 7. Password Hashing — Argon2id

**קובץ:** `packages/auth/src/crypto/password.ts`

```ts
return argon2.hash(plain, {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MiB
  timeCost: 3,
  parallelism: 4,
});
```

- **תקין** — תואם המלצת OWASP 2024.
- בודק אורך מינימלי 8 לפני hashing, ו-`isStrongPassword` דורש 10 + מורכבות.

**הערה:** ב-HR worktree משתמשים ב-JWT עם expiresIn 7d, אך לא ראיתי את ה-hashing שם — יש להבטיח שכל המודולים משתמשים ב-`@aneh/auth` ולא בריענון מקומי של bcrypt/MD5.

---

## 8. Field-level Encryption (AES-256-GCM)

**קבצים:** `packages/auth/src/crypto/aes.ts` + `server/src/utils/crypto.ts` (HR)

### חיובי
- AES-256-GCM (אלגוריתם מודרני, מאומת).
- IV 12 byte אקראי בכל הצפנה.
- Auth Tag 16 byte (GCM).
- שדות מוגדרים: `salary, bankAccount, nationalId, totpSecret`.

### בעיות חמורות
1. **המפתח נשמר ב-`AES_KEY_HEX` כ-ENV variable** — סטייה מ-best practice. צריך **AWS KMS / Azure Key Vault / GCP KMS / HashiCorp Vault**. בפועל, מי שניגש ל-process.env ניגש למפתח.
2. **אין Key Rotation** — אין מנגנון version של מפתחות (`v1`, `v2`) או re-encrypt batch.
3. **אין HMAC על שדות שצריך לחפש לפיהם** (למשל nationalId לחיפוש) — אם יחפשו ע"י encrypted value, יתגלה גם plaintext.
4. **שדות לא מוצפנים ב-Prisma schema** — ב-`packages/db/prisma/schema.prisma:1141-1151`:
   ```prisma
   nationalId   String?
   monthlySalary Decimal? @db.Decimal(12, 2)
   bankAccount  String?
   ```
   הצפנה היא application-level בלבד — מי שיגש ל-DB ישירות (DBA, dump) יראה plaintext. **אין enforcement ב-DB**.

---

## 9. JWT — Secret Rotation, Expiry, Refresh

**קובץ Auth:** `packages/auth/src/crypto/tokens.ts`, `config/index.ts`

### Auth module (`agent-a0d949436df27ed12`)
- Access TTL: 15m (תקין).
- Refresh TTL: 30d (סביר אם יש revocation).
- Issuer claim מוגדר.
- **אין rotation של JWT_SECRET** — לא יוגדר secret v1/v2 ולא rotation strategy.
- **אין JTI / blacklist** — מחיקה של refresh tokens בודדים תלויה רק במחיקת session (Redis).

### HR module (`agent-a50ad709234b49b0b`) — **בעייתי**
**קובץ:** `server/src/middleware/auth.ts:22`
```ts
export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "7d" });
}
```
- **7 ימים לאסס טוקן ללא refresh** — חמור. אם נגנב — תקף 7 ימים מלאים.
- אין issuer/audience claims.
- אין revocation list.

### Finance module — **קריטי**
**קובץ:** `agent-a31b566159e7cc878/finance-docs/.env.example`
```
JWT_SECRET="change-me"
```
- אם זה ישוחרר לפרודקשן כפי שהוא — כל מי שראה את ה-repo יכול לחתום JWT וולידי.

---

## 10. 2FA — חובה למנהלים

**קובץ:** `packages/auth/src/middleware/authenticate.ts:34`
```ts
if (opts?.require2Fa && user.twoFaEnabled && !sess.twoFaPassed) {
  return res.status(401).json({ ... });
}
```

### הערכה
- 2FA מומש (TOTP + SMS + backup codes) — מצוין.
- **אך** הוא נכנס לפעולה רק אם:
  1. ה-route מוגדר עם `require2Fa: true`, וגם
  2. `user.twoFaEnabled === true`.
- **אין policy שמכפיף משתמשים בעלי תפקיד `general_manager / finance / hr` ל-2FA חובה**. משתמש כזה יכול לבחור לבטל 2FA וייכנס בלעדיו.

---

## 11. Audit Log — Append-Only

**קובץ:** `agent-a5e9ec7d29999be9c/prisma/migrations/001_audit_log/migration.sql`

### חיובי — מימוש מצוין
- 3 טריגרים: `audit_logs_no_update`, `audit_logs_no_delete`, `audit_logs_no_truncate`.
- `RAISE EXCEPTION ... USING ERRCODE = 'insufficient_privilege'`.
- RLS פעיל + `FORCE ROW LEVEL SECURITY`.
- מדיניות RLS שונה ל-SELECT/INSERT/UPDATE/DELETE.
- `audit_force_server_timestamp` — מונע trust ל-client clock.
- README מציין שה-app מתחבר עם `app_user` שיש לו רק `SELECT, INSERT`.

### חסרים קלים
- **אין WAL streaming** ל-storage חיצוני (S3 / Glacier) — DROP DATABASE מוחק את הכל למרות הטריגרים.
- חתימה דיגיטלית של רשומות (chain-of-hash) — לא קיימת. בלי זה DBA יכול תאורטית להפיל את כל הטבלה (RAISE EXCEPTION לא חוסם superuser).

---

## 12. RBAC

**קובץ:** `packages/auth/src/rbac/roles.ts`

### חיובי
- **4 רמות מומשו**: `module / action / field / record`.
- White/Black lists לכל permission.
- שתי קטגוריות: `official` / `unofficial` — תואם דרישת המערכת.
- Field-level: `denyField('users', 'salary')` — מצוין.
- Record-level: `ownRecord('orders', 'agent_id == :user.id')`.

### בעיות
- **predicate parsing**: לא ראיתי את `policy/engine.ts` המלא, אך השימוש ב-string predicates עם `:user.id` מצריך parser בטוח. אם זה `eval()` או דומה — **חולשת RCE קריטית**.
- אין role גנרי לאודיט (read-only audit log) פרט ל-`general_manager`.
- `customer` role לא מופיע במטריצה — אם משתמש לקוח מצליח לקבל token, אין הגדרת מה הוא יכול לעשות.

---

## 13. Rate Limiting

**קובץ:** `packages/auth/src/middleware/rateLimit.ts`

- שני limiters: global (100/min) ו-login (5/15min).
- מבוסס Redis עם נפילה ל-memory store.
- ה-`keyGenerator` ללוגין משלב `ip + email` — מצוין נגד credential stuffing מקבילי.

### חסר
- **אין IP blocklist** מצטבר.
- **אין captcha** אחרי N ניסיונות כושלים.
- ה-fallback ל-memory store בלי Redis — ב-multi-instance pod שווה ל-no rate-limit. צריך להפיל את ה-app אם Redis לא זמין בפרודקשן.

---

## 14. PCI Scope — Cardcom

**קובץ:** `packages/integrations/cardcom/src/types/index.ts:112`

### בעיה
```ts
export const TokenizeInputSchema = z.object({
  cardNumber: z.string().min(12).max(19).optional(),
  ...
  cvv: z.string().min(3).max(4).optional(),
  fromTransactionId: z.string().optional(),
  ...
});
```

- ה-schema **מאפשר** שליחת `cardNumber` ו-`cvv` ישירות (DAT mode).
- ה-comment בקוד אומר "iframe, zero-PCI" אבל ה-TokenizeInput לא חוסם DAT.
- **PCI scope לא zero** אם הקוד אי-פעם משתמש ב-`cardNumber` ישירות (גם אם רק כ-passthrough).

### חיובי
- LowProfile (iframe) מומש — זה הנכון.
- `verifySignature` משתמש ב-HMAC-SHA256 עם `timingSafeEqual` — מצוין.
- אין שמירת card data ב-DB schema של chargebacks.

### המלצה
**להסיר** את שדות `cardNumber/cvv` מ-`TokenizeInputSchema` ולכפות `fromTransactionId` בלבד — או לוודא שלא קיים `/tokenize` endpoint שמקבל אותם משתמש קצה.

---

## 15. SQL Injection

- כל הקבצים שנבדקו משתמשים ב-Prisma ORM.
- לא מצאתי `$queryRaw\`` שמשלב user-input ישירות.
- ב-`leads.ts` שאילתות `contains` עם param binding של Prisma — בטוח.
- **המלצה:** הוסיפו ESLint rule שמכריז `$queryRaw` ו-`$executeRaw` כ-restricted (require explicit allow comment).

---

## 16. XSS

- React JSX escape אוטומטי — בסיס תקין.
- CSP מוגדר ב-`securityHeaders.ts`:
  ```ts
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  ```
- **`unsafe-inline` ל-styleSrc** — נדרש ל-RTL fonts/Tailwind, אבל אפשר ב-nonce.
- אין `script-src 'nonce-...'` — כל סקריפט inline יחסם, אבל גם integrations שדורשות זה ייכשלו.

### חסר
- **אין sanitization** של HTML מ-templating במודול שיווק (`templating.ts` מקבל HTML מלא ומפעיל renderTemplate). אם משתמש marketing מוסיף `<script>` ב-template — יישלח. **חולשת stored XSS פוטנציאלית** דרך email preview ב-admin UI.

---

## 17. CSRF

**קובץ:** `packages/auth/src/crypto/tokens.ts`
```ts
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
export function timingSafeEq(a: string, b: string): boolean { ... }
```

- הפונקציה קיימת — טוב.
- **לא מצאתי middleware** שמתקין double-submit cookie / synchronizer token. ה-cookie של access_token משתמש ב-`sameSite: 'strict'` (מצוין), אבל ה-portal משתמש ב-`sameSite: 'lax'` (נחות).
- **חסר**: בדיקה ש-`generateCsrfToken` נקרא על כל form submission שכוללת state change.

---

## 18. Cookies — httpOnly + Secure + SameSite

| מודול | httpOnly | Secure | SameSite |
|---|---|---|---|
| Auth (`authRoutes.ts`) | ✓ | רק בפרוד (`process.env.NODE_ENV === 'production'`) | strict |
| Customer Portal (`session.ts`) | ✓ | **חסר!** | lax |

### בעיה
ב-`apps/customer-portal/src/lib/session.ts`:
```ts
c.set(COOKIE, sid, {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 30
});
```
- **חסר `secure: true`** — cookie יישלח ב-HTTP plain אם המשתמש מתחבר במלון/Wi-Fi.
- 30 ימים maxAge ללא refresh — חשוף.

---

## חולשות נוספות שזוהו

### 19. Customer Portal — OTP חלש
**קובץ:** `apps/customer-portal/src/lib/auth.ts:6`
```ts
const code = String(Math.floor(100000 + Math.random() * 900000));
```
- **`Math.random()` לא קריפטוגרפי** — צפוי לאחר ~2¹⁴ דגימות. חייב `crypto.randomInt`.
- ה-OTP מודפס ל-console:
  ```ts
  console.log(`[OTP] ${email} -> ${code}`);
  ```
  אם זה רץ בפרודקשן — חולשה קטסטרופלית בלוגים.

### 20. Customer Portal — In-Memory Store
- כל ה-session, OTP, users ב-`Map` בזיכרון. **לא מתאים לפרודקשן** — restart אובד.
- אין הצפנה בזיכרון.

### 21. Marketing — חסר רישום consent IP/timestamp
- `consentEmail: z.boolean().default(false)` — שדה בוליאני בלבד.
- אין `consentSource`, `consentTimestamp`, `consentIp`, `consentDoubleOptIn`.
- חוק התקשורת דורש להוכיח **מתי** ניתנה ההסכמה. בלי זה — חשיפה לקנס של עד 67,300 ₪ לכל הפרה (תיקון תשע"ז).

---

# סיכום — מה מונע שחרור

## חוסרים חוקיים שמונעים שחרור לפרודקשן (BLOCKER)

| # | חוסר | חוק / תקנה | פעולה נדרשת |
|---|---|---|---|
| L1 | **מע"מ 17% כברירת מחדל בכל המערכת** | חוק מע"מ — שיעור 18% מ-1.1.2025 | עדכון `VAT_RATE` ל-0.18, `vatRate` types ל-18, וטסט מקיף |
| L2 | **תיעוד שגוי של ספי 2024** ("5,000 ₪ במקום 25,000 ₪") | מודל ישראל — רשות המסים | תיקון comment + הוספת הצהרת שנה למסמך |
| L3 | **אין fallback ל-iCount** | תיעוד פנימי — חוק עוסקים | הוספת queue + retry + alert + מצב ידני |
| L4 | **אין PDF/XML archival לחשבוניות 7 שנים** | סעיף 25 לחוק מע"מ + סעיף 30 לחוק החברות | הוספת S3/Glacier WORM + retention policy |
| L5 | **אין זכות עיון/מחיקה** | תיקון 13 לחוק הגנת הפרטיות (8/2025) | route `/me/export`, `/me/delete` + תור anonymization |
| L6 | **אין double-opt-in לדיוור + לוג consent** | סעיף 30א חוק התקשורת | הוספת `consentTimestamp/IP/Source/DoubleOptIn` למודל Lead |
| L7 | **טופס 106/102/126 רק כ-PDF** | תקנות ניכויים | ייצוא XML/Mai101 רשמי |
| L8 | **תוכנה מאושרת 1346 לא מודפסת על החשבונית** | סעיף 13ב לתקנות מס הכנסה (1346) | הוספת רישום על PDF |

## פגיעויות אבטחה קריטיות (CRITICAL — fix before any deploy)

| # | פגיעות | חומרה | מודול | תיקון |
|---|---|---|---|---|
| C1 | `JWT_SECRET="change-me"` ב-`.env.example` של finance-docs | קריטי | חשבוניות | להחליף ל-`REPLACE_WITH_64_BYTE_HEX_FROM_KMS` + בדיקת startup שלא ערך default |
| C2 | OTP נוצר ב-`Math.random()` ומודפס לconsole | קריטי | Customer Portal | `crypto.randomInt(100000, 1000000)`, להסיר console.log |
| C3 | AES key ב-ENV ללא KMS | גבוה | כל המערכת | מעבר ל-AWS KMS / Vault עם envelope encryption |
| C4 | Cookie ללא `Secure: true` בפורטל | גבוה | Customer Portal | להוסיף `secure: process.env.NODE_ENV === 'production'` |
| C5 | 2FA לא חובה למנהלים | גבוה | Auth | hook ב-AuthService שבודק role ומסמן `requireTwoFa` |
| C6 | JWT 7 ימים ללא refresh ב-HR | גבוה | HR | להחליף ל-15m access + refresh ארוך מנוהל |
| C7 | אין hashing ב-Prisma schema לשדות רגישים | גבוה | DB | להוסיף `@@check` constraint או triggers שמאמתים שהשדה אינו plaintext |
| C8 | RBAC predicate parser לא ברור | גבוה | Auth | סקירה של `policy/engine.ts` — לא להשתמש ב-eval |
| C9 | Marketing template renders raw HTML — stored XSS | גבוה | שיווק | DOMPurify לפני שמירת template |
| C10 | אין Data Breach process (72h) | בינוני-גבוה | תפעולי | runbook + alert pipeline → DPO |
| C11 | Cardcom TokenizeInput מקבל cardNumber/cvv | בינוני | Cardcom | הסרת השדות מהsche או חסימה ב-runtime |
| C12 | Audit Log לא משכפל ל-WORM חיצוני | בינוני | Audit | streaming ל-S3 Glacier deep archive |

---

## המלצות תיקון לפי priority

### P0 — לתקן לפני כל deploy (חוסם release)
1. **מע"מ 18%** — סקריפט אוטומטי שמחפש `0.17` ו-`17%` בכל הריפו ומעדכן.
2. **`JWT_SECRET` ב-`.env.example`** — להחליף לערך מובן שמחייב החלפה + `process.exit(1)` ב-startup אם זוהה.
3. **OTP קריפטוגרפי + ביטול console.log** ב-Customer Portal.
4. **`Secure: true` בכל ה-cookies בפרוד**.
5. **בדיקה אוטומטית** של מבנה PCN874 מול דוגמה רשמית של רשות המסים.

### P1 — Pre-production (תוך 14 יום)
6. KMS integration ל-AES keys + key versioning.
7. 2FA חובה לתפקידי `general_manager`, `finance`, `hr` (default policy ב-DB seed).
8. Refresh token flow ב-HR module + JWT TTL מאוחד למערכת.
9. Routes `/me/export` ו-`/me/delete` בכל המודולים.
10. Consent ledger מלא ב-Marketing (timestamp/IP/source/double-opt-in).
11. PDF + XML archival של חשבוניות ל-S3 Object Lock (WORM) ל-7 שנים.
12. CSRF middleware אוטומטי על כל POST/PUT/DELETE state-changing routes.

### P2 — תוך חודש מהשחרור
13. Audit Log → S3 Glacier deep archive עם hash chain.
14. RBAC predicate engine — לא eval, AST parser בטוח.
15. Marketing template HTML sanitization (DOMPurify).
16. Captcha אחרי 3 כשלי login.
17. WebAuthn / Passkeys כאופציית 2FA נוספת.
18. SIEM integration (Audit log → Splunk/Sentinel).
19. DPO appointment + Privacy Impact Assessment (PIA).
20. Penetration test חיצוני לפני go-live.

### P3 — תחזוקה שוטפת
21. Key rotation quarterly.
22. Quarterly access review (RBAC matrix audit).
23. Annual compliance audit מול רשם מאגרי המידע.
24. Tabletop exercise לתרחיש דליפת מידע (72h notification).

---

## פירוט worktrees שלא נסקרו מלא בסקירה זו

worktrees מספרים 06, 08-14, 20-21, 24 — לא נסקרו מקרוב בסבב זה. **לפני שחרור** יש להחיל את אותה רשימת בדיקה (18 הנקודות) על כל worktree שמכיל קוד שרץ בפרוד.

---

## נספח א' — ערכי משכורת/מס נדרשים לאימות 2026

יש לקבל מהיועץ המשפטי / רואה החשבון את המספרים הסופיים ל:
- מדרגות מס הכנסה 2026 (כיום בקוד "הערכה").
- שכר מינימום 2026 (כיום 5,880 ₪ "הערכה").
- תקרת ביטוח לאומי (כיום 49,030 ₪ "הערכה").
- ערך נקודת זיכוי 2026 (כיום 247 ₪).

ללא אישור פורמלי — לא לפעיל את מנוע השכר בפרוד.

---

## נספח ב' — בדיקות שיש להריץ

```bash
# בדיקה אוטומטית של חוסרים קריטיים
grep -r "JWT_SECRET=\"change-me\"" .
grep -r "0\.17\|vatRate.*17\b" .
grep -r "Math\.random" --include="*.ts" --include="*.js" | grep -i "otp\|token\|secret\|code"
grep -r "secure:\s*false" --include="*.ts"
```

---

**מסקנה סופית**: המערכת **לא מוכנה לפרודקשן**. נדרשים תיקוני P0+P1 (12 פריטים) לפני שחרור.
מומלץ לקיים security review חוזר אחרי P0 ו-pentest חיצוני אחרי P1.

</div>
