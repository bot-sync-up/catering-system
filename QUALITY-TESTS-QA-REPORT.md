<div dir="rtl">

# דוח QA — איכות קוד, טסטים, ו-Stubs vs Production
### מערכת קייטרינג / "ענה את השואל" — סקירה רוחבית של 24 worktrees

**מעריך:** QA Agent (Opus 4.7, 1M context)
**תאריך:** 2026-05-11
**Worktree של הבדיקה:** `C:\Users\user\.claude\worktrees\agent-adc38842acf6d4eb0`

---

## 1. סיכום מנהלים

נסרקו 24 worktrees הקשורים למערכת קייטרינג/אירועים בעברית RTL. **הממצא המרכזי:** רמת הבשלות פרוסה על קשת רחבה ביותר — משלוש אינטגרציות-עומק שבאמת מוכנות לייצור (CardCom, iCount, OCR-Vision) ועד שבעה worktrees ריקים לחלוטין (`webside-testter`) שלא הכילו שום קוד מבצעי.

### חלוקה גסה לפי בשלות

- **באמת קרוב לייצור (Real, חיבור אמיתי):** 4 worktrees — 12 (OCR), 18 (iCount), 19 (CardCom), 23 (Marketing/Comms)
- **קוד ניכר אבל עם stub-ים מקומיים:** 9 worktrees — 03, 04, 05, 06, 09, 15, 17, 22, 24, 25
- **JavaScript ולא TypeScript, sql.js במקום DB אמיתי:** 4 worktrees — 08, 10, 11, 13, 14, 16, 21
- **ריק / placeholder ("webside-testter"):** 7 worktrees — 02 (חלקי), 07 (חלקי), 10, 13, 14, 16, 21 (כותרת ריקה אבל יש קוד), 25
- **scaffolding Sprint 0 בלבד:** 1 — worktree 01

### כותרות עיקריות בדוח

1. **CardCom (19), iCount (18), OCR (12)** הם המודולים הכי בוגרים — לקוחות axios אמיתיים נגד endpoint-ים אמיתיים, schema-validation עם Zod, retry+pino logging, ו-50% test ratio (iCount).
2. **WT07 (customer-portal)** מכיל במפורש `Cardcom iframe stub` ו-"simulated kitchen/delivery progression for the demo" — לא מחובר ל-CardCom.
3. **7 worktrees** מכילים רק `# webside-testter` ב-README ועדיין מכילים קוד (10, 11, 13, 14, 16, 21) או לא מכילים שום TS (10, 13, 14, 16) — סוכנים לא הריצו את המשימה.
4. **0 (אפס) E2E tests** בכל המערכת (אין Playwright/Cypress בשום worktree).
5. **TypeScript strict mode** מוגדר ב-11 מ-24 worktrees בלבד; 7 worktrees ב-JavaScript טהור ללא בדיקת טיפוסים.
6. **sql.js (JSON-backed)** מחליף את `better-sqlite3` ב-WT10 ו-WT14 — אינו מתאים לייצור עם concurrent writers.
7. **OAuth Google+Facebook (WT03)** ממומש עם `passport-google-oauth20` ו-`passport-facebook` אמיתיים — מותנה ב-env vars.
8. **WebAuthn (WT15)** ממומש עם `@simplewebauthn/server` אמיתי, אבל ה-challenge store הוא `Map` ב-memory (כתוב במפורש: "פרודקשן: Redis").
9. **R2 (WT24)** משתמש ב-`@aws-sdk/client-s3` נגד `r2.cloudflarestorage.com` עם fallback לכתיבה לדיסק מקומי כשאין credentials.
10. **IMAP listener (WT12)** ממומש עם `imapflow` + `mailparser` — חיבור אמיתי.

---

## 2. ניתוח לפי worktree

### WT 01 — Monorepo Sprint 0 (`agent-ac2389dbcde5e8bd9`)
- **תוכן:** scaffolding לבד. 18 קבצי TS, 0 טסטים. מבנה apps/web, apps/customer-portal, packages/{db,api,ui,utils,integrations}.
- **stubs:**
  - `packages/integrations/src/email.ts` — nodemailer transport אמיתי (factory). אין wrapper לשליחה.
  - `packages/integrations/src/r2.ts` — S3Client אמיתי, אבל קורס אם אין credentials (`throw new Error`).
- **DB:** Drizzle ORM + Postgres 16 (אמיתי).
- **בשלות:** Sprint 0 בלבד — אין routes, אין endpoints, אין logic.

### WT 02 — `agent-abcfc839a28d7b588` ("webside-testter")
- **תוכן:** רק `packages/db` עם schema.prisma של 1688 שורות + seed.ts. השאר ריק.
- **README:** ריק (`webside-testter`).
- **בשלות:** schema בלבד; אין שום קוד אפליקטיבי.

### WT 03 — Auth + Screens (`agent-a0d949436df27ed12`)
- **תוכן:** 33 קבצי TS, 6 קבצי טסט (ratio 18%, 222 LOC טסטים).
- **OAuth:** passport-google-oauth20 + passport-facebook **אמיתי**. נטען רק אם env vars מוגדרים (`GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL`).
- **2FA:** TOTP + SMS (Twilio) — אמיתי.
- **Crypto:** Argon2id + AES-256-GCM אמיתיים.
- **Session:** Redis-backed.
- **חולשה:** `repository.ts` עם `InMemoryUserRepo` — צריך החלפה ל-Postgres-backed.
- **strict:** כן.

### WT 04 — Audit Log (`agent-a5e9ec7d29999be9c`)
- **תוכן:** 23 קבצי TS, 2 טסטים (auditQuery, sanitize — 73 LOC).
- **Prisma middleware אמיתי** ל-CRUD logging, AsyncLocalStorage לקונטקסט, hooks לאירועי auth.
- **בשלות:** ליבה כתובה כראוי; חסר ה-CSV/PDF export בפועל.
- **strict:** כן (×2 tsconfigs).

### WT 05 — CRM (`agent-ad2220241a52022d0`)
- **תוכן:** 37 קבצי TS, **0 טסטים**.
- Next.js 15 + tRPC + Prisma + dnd-kit + BullMQ — סטאק מלא ואמיתי.
- **דאגה:** אפס טסטים על מערכת CRM שלמה. Sales Pipeline Kanban ללא בדיקות regression.
- **strict:** כן.

### WT 06 — מנגנון הזמנות / State Machine (`agent-a3864f31565b63390`)
- **תוכן:** 40 קבצי TS, 7 קבצי טסט (ratio 18%, 422 LOC) — XState state machine + hooks + cancellation policy + refunds + swap + waitlist.
- **בשלות:** טסטים על state machine + cancellation policy = נכס אמיתי. אחד מה-worktrees הבוגרים.
- **TODO/FIXME:** 2 קבצים.
- **strict:** כן.

### WT 07 — Customer Portal (`agent-aecddcb45d3db0342`)
- **תוכן:** 37 קבצי TS, **0 טסטים**.
- **README של ה-root** = `webside-testter` (ריק); README של ה-app בפנים = מלא.
- **CardCom = STUB מובהק:** מפורש בקוד —
  - `apps/customer-portal/src/app/api/checkout/cardcom/route.ts`: "Cardcom iframe **stub**. In production this would call Cardcom's LowProfile"
  - `api/orders/[id]/pay/route.ts`: "Cardcom callback stub: in real life Cardcom posts here"
  - "the simulated kitchen/delivery progression for the demo"
- **בשלות:** UI עובד לדמו, אבל ה-payment flow כולו פיקטיבי. צריך לחבר לחבילת @integrations/cardcom (WT19).

### WT 08 — Menu & Pricing Platform (`agent-a1f475c6464b1f625`)
- **תוכן:** **JavaScript בלבד** (לא TypeScript). 40 קבצי .js, 1 קובץ טסט (36 LOC).
- Server: Express + Prisma — אמיתי.
- Client: React + Vite + react-query + @hello-pangea/dnd.
- **חולשה:** ratio 2% טסטים על מערכת תמחור = סיכון רגרסיה גבוה. אין `tsconfig`.

### WT 09 — Recipes & Pricing (`agent-adc7b003297d67905`)
- **תוכן:** 32 קבצי TS, **0 טסטים**.
- Next.js 14 + Prisma + SQLite (אמיתי) + PWA (manifest+SW).
- **חולשה:** אפס טסטים על מערכת קוסטינג מורכבת (FIFO, scaling, Gantt).
- **אין strict** ב-tsconfig.

### WT 10 — Inventory (`agent-a9490fdab3005fda1`)
- **תוכן:** JavaScript בלבד. 11 קבצי js, 0 טסטים. `inventory/` תת-תיקייה.
- **DB = sql.js (JSON-backed!):** `inventory/src/lib/db/index.js` — pure-JS replacement של better-sqlite3, שמירה דחויה לקובץ עם `setTimeout(100ms)`. **לא מתאים לייצור עם concurrent requests** — race conditions צפויות.
- **README:** `webside-testter` (ריק).

### WT 11 — Suppliers + PO (`agent-a23e11108be93681b`)
- **תוכן:** JavaScript. 16 קבצי js, 0 טסטים.
- Express + SQLite.
- README של ה-root מציין במפורש: "**שליחת מייל stub** — להחלפה בייצור".
- "פורטל ספק (HTML stub)" — לא ממומש.

### WT 12 — OCR Claude Vision + IMAP (`agent-a9ab30939b7e8e2c3`)
- **תוכן:** 29 קבצי TS, 3 טסטים (alerts, items, schema — 129 LOC).
- **Claude Vision: אמיתי!**
  - `vision/extract.ts`: `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`, מודל `claude-opus-4-7`, image source base64.
  - **Prompt caching ממומש** עם `cache_control: { type: 'ephemeral' }` ב-`vision/prompt.ts`.
  - מחזיר `cacheReadTokens` + `cacheCreationTokens` ב-usage.
- **IMAP: אמיתי** — `imapflow` + `mailparser`, polling של messages unseen, drainOnce עם attachments.
- **iCount client בתוך OCR**: יש חיבור פנימי ל-iCount API (`src/icount/client.ts`) — אבל זה duplicate של WT18.
- **חולשה:** test ratio 10% למערכת קריטית כמו OCR; 1 קובץ TODO.
- **strict:** כן.

### WT 13 — Event Manager (`agent-ab6c0dce79413e79f`)
- **תוכן:** JavaScript. 5 קבצי js בלבד, 0 טסטים. README ריק.
- **בשלות:** scaffold דק; לא ראוי לייצור.

### WT 14 — Logistics (`agent-aa05ac323e9015be7`)
- **תוכן:** JavaScript. 13 קבצי js, 0 טסטים. README ריק.
- **DB = sql.js (JSON-backed):** אותה בעיה כמו WT10 — `logistics.db` נטען כ-`Uint8Array` לזיכרון ונשמר כקובץ. לא מתאים ל-concurrent writes.

### WT 15 — HR + Performance + Attendance (`agent-a50ad709234b49b0b`)
- **תוכן:** 22 קבצי TS, **0 טסטים**.
- **WebAuthn: אמיתי!** `@simplewebauthn/server` עם `generateRegistrationOptions` + `verifyRegistrationResponse` + `userVerification: "required"` (Face ID/טביעה).
- **חולשה קריטית:** `const challenges = new Map<string, string>()` — challenge store **in-memory**, המפתח עצמו מציין בהערה: "In-memory challenge store (פרודקשן: Redis)". אין החלפה.
- bcryptjs לסיסמאות.
- **strict:** כן.

### WT 16 — Payroll System (`agent-ab96ab384014c8442`)
- **תוכן:** JavaScript. 12 קבצי js, 0 טסטים. README ריק (`webside-testter`).
- **בשלות:** unknown — לא ניתן להעריך ללא הרצה.

### WT 17 — Finance Docs (`agent-a31b566159e7cc878`)
- **תוכן:** 25 קבצי TS, 4 טסטים (aging, money, rbac, state — 92 LOC, ratio 16%).
- מערכת מסמכים פיננסיים מלאה עם state machine (QUOTE→ORDER→PROFORMA→TAX_INVOICE→RECEIPT), aging dashboard, חישובי מע"מ.
- **Notify service:** nodemailer + Twilio (SMS+WhatsApp) — אמיתי, לא mock.
- **strict:** כן.
- **בשלות:** קרוב לייצור — חסר Allocation Number (מס' הקצאה) לפי תקן 1346.

### WT 18 — iCount Integration (`agent-accb121134afd7c1a`)
- **תוכן:** 16 קבצי TS, **8 טסטים (50% ratio, 654 LOC)** — הכי הרבה טסטים יחסית במערכת.
- **REST client אמיתי:** axios + axios-retry + uuid + zod validation.
- `rest-client.ts` נגד `https://api.icount.co.il/api/v3.php`.
- adapters/factory לתמיכה ב-iCount + GreenInvoice + Rivhit.
- BullMQ queue, webhook receiver, allocation-number tests.
- **strict:** כן.
- **בשלות הגבוהה ביותר במערכת** — מוכן לייצור עם credentials.

### WT 19 — CardCom Integration (`agent-a91fe015c553e924f`)
- **תוכן:** 23 קבצי TS, 4 טסטים (client, flows, retry, webhook — 315 LOC, ratio 17%).
- **CardComClient אמיתי:** axios נגד `https://secure.cardcom.solutions/api/v11/...`, Zod schemas על כל input, retry, pino logging.
- LowProfile (iframe zero-PCI), Tokenization, Recurring, Bit/GooglePay/ApplePay, Refund.
- Webhook handler אמיתי.
- **strict:** כן.
- **בשלות:** ייצור.

### WT 21 — Fleet (`agent-a2f8c66ff540bd496`)
- **תוכן:** JavaScript. 28 קבצי js, 0 טסטים. README ריק.
- Express API + mobile (RN?) + web — מבנה גדול אבל ללא TS וללא טסטים.
- **בשלות:** unknown; חסר ראיות.

### WT 22 — BI Reports (`agent-a0cfd9be4e88397cc`)
- **תוכן:** 32 קבצי TS, 2 טסטים (aggregations, flags — 74 LOC, ratio 6%).
- Next.js 14 + Prisma + BullMQ + Recharts + exceljs + pdfkit.
- **SendGrid:** אמיתי (`@sendgrid/mail`), עם fallback ל-`console.warn` אם אין API key.
- **strict:** כן.
- **חולשה:** test ratio נמוך למערכת דוחות כספיים.

### WT 23 — Marketing Platform / Comms (`agent-a7f6f8c320f0b1219`)
- **תוכן:** 46 קבצי TS, **0 טסטים**. README של ה-root ריק; ה-app בפנים מלא.
- **SendGrid:** אמיתי (`@sendgrid/mail`).
- **019 SMS:** XML SOAP-style אמיתי נגד `https://www.019sms.co.il/api` (עם XML parsing). **fallback אוטומטי ל-Twilio.**
- **Twilio:** SDK אמיתי.
- **WhatsApp Cloud API:** axios אמיתי נגד `https://graph.facebook.com/v21.0` עם Bearer token. תומך ב-text + template messages.
- כל provider מציג `logger.warn(... simulated)` כשאין credentials.
- **חולשה:** אפס טסטים על integration layer עם 4 providers שונים — סיכון מוסתר כי החתימות בעייתיות לחזות.
- **strict:** כן.

### WT 24 — Public Site + Contracts (`agent-a4541f69f7ac884b2`)
- **תוכן:** 46 קבצי TS, **0 טסטים**.
- **R2 Storage: אמיתי!** `@aws-sdk/client-s3` עם endpoint `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`. fallback לדיסק מקומי `data/contracts/` כשאין credentials.
- PDFKit לחוזים, MDX לבלוג, JSON-LD לSEO, sitemap+robots דינמיים.
- **חולשה:** אפס טסטים על חוזים — payload משפטי שדורש בדיקות חוזיות (contract testing).
- **strict:** כן.

### WT 25 — Field Ops Mobile (Expo+RN) (`agent-a869d3b70f23a9a88`)
- **תוכן:** 58 קבצי TS, **0 טסטים**.
- **WatermelonDB** אמיתי לסנכרון offline-first, expo-notifications, expo-secure-store, expo-location, react-native-signature-canvas.
- 1 קובץ TODO.
- **חולשה:**
  - אפס טסטים על אפליקציית mobile מורכבת (6 roles, sync, conflict resolution).
  - לא נמצאו `dir="rtl"` בעברית, אבל ה-README מצהיר RTL — צריך בדיקה ידנית.
- **strict:** כן.

---

## 3. תיקוף Stubs vs Production לפי הדרישות

| # | פיצ'ר נדרש | מי בעלים | סטטוס | הוכחה |
|---|------------|----------|-------|-------|
| 1 | **CardCom** | WT19 | **Real** | `axios.post` ל-`secure.cardcom.solutions/api/v11`; Zod על כל input; retry; pino; 4 קבצי טסט |
| 1' | CardCom ב-customer-portal | WT07 | **Stub במפורש** | "Cardcom iframe stub. In production this would call Cardcom's LowProfile" |
| 2 | **iCount** | WT18 | **Real** | `https://api.icount.co.il/api/v3.php`; 8 קבצי טסט, ratio 50%; nock לטסטים |
| 3a | **SendGrid** | WT22, WT23 | **Real** | `@sendgrid/mail` עם `sgMail.setApiKey`. fallback `simulated-${ts}` |
| 3b | **SES** | — | **חסר** | אין שום שימוש ב-`@aws-sdk/client-ses` בכל ה-worktrees |
| 3c | **Twilio** | WT03, WT17, WT23 | **Real** | `twilio(sid, token).messages.create` עם normalization של +972 |
| 3d | **019 SMS** | WT23 | **Real** | POST XML ל-`https://www.019sms.co.il/api`, parse `<status>` |
| 3e | **WhatsApp Cloud API** | WT23 | **Real** | axios ל-`graph.facebook.com/v21.0/{phoneId}/messages` עם Bearer; text + template |
| 4 | **OCR Claude Vision** | WT12 | **Real** | `new Anthropic({ apiKey })`, model `claude-opus-4-7`, image base64, **prompt caching עם `cache_control: ephemeral`** |
| 5 | **IMAP listener** | WT12 | **Real** | `ImapFlow` + `simpleParser`, drainOnce על unseen, mark Seen |
| 6 | **WebAuthn** | WT15 | **Real אבל חצי** | `@simplewebauthn/server` אמיתי; challenge store = `Map` in-memory (צריך Redis לפרודקשן — מצוין במפורש בהערה) |
| 7 | **OAuth Google/Facebook** | WT03 | **Real (תלוי env)** | passport-google-oauth20 + passport-facebook, נטען רק אם CLIENT_ID/SECRET קיימים |
| 8 | **R2 storage** | WT24 (וגם WT01) | **Real** | `@aws-sdk/client-s3` עם endpoint `r2.cloudflarestorage.com`. WT24 עם fallback לדיסק; WT01 זורק שגיאה |
| 9 | **Bank integrations** | — | **חסר** | אין שום worktree עם OFX/CSV upload, ואין שום קוד בנק (Hapoalim/Discount/Leumi API) |
| 10a | **better-sqlite3 → sql.js** | WT10, WT14 | **Stub לא-מתאים-לייצור** | sql.js עם persistence דרך `fs.writeFileSync` — race conditions ב-concurrent writes |
| 10b | **WatermelonDB (mobile)** | WT25 | **Real** | `@nozbe/watermelondb` עם expo-sqlite native |

---

## 4. מטריקות איכות

### Test Coverage

| WT | Source Files | Test Files | Test LOC | Ratio | Notes |
|----|--------------|------------|----------|-------|-------|
| 01 | 18 | 0 | 0 | 0% | scaffold |
| 02 | 2 | 0 | 0 | 0% | DB schema only |
| 03 | 33 | 6 | 222 | 18% | auth tests |
| 04 | 23 | 2 | 73 | 9% | audit |
| 05 | 37 | 0 | 0 | 0% | CRM ללא טסטים |
| 06 | 40 | 7 | 422 | 18% | state machine |
| 07 | 37 | 0 | 0 | 0% | portal ללא טסטים |
| 08 | 40 (JS) | 1 | 36 | 2% | menu/pricing |
| 09 | 32 | 0 | 0 | 0% | recipes |
| 10 | 11 (JS) | 0 | 0 | 0% | inventory |
| 11 | 16 (JS) | 0 | 0 | 0% | suppliers |
| 12 | 29 | 3 | 129 | 10% | OCR |
| 13 | 5 (JS) | 0 | 0 | 0% | event mgr stub |
| 14 | 13 (JS) | 0 | 0 | 0% | logistics |
| 15 | 22 | 0 | 0 | 0% | HR ללא טסטים |
| 16 | 12 (JS) | 0 | 0 | 0% | payroll stub |
| 17 | 25 | 4 | 92 | 16% | finance docs |
| **18** | **16** | **8** | **654** | **50%** | **iCount (הכי טוב)** |
| 19 | 23 | 4 | 315 | 17% | CardCom |
| 21 | 40 (JS) | 0 | 0 | 0% | fleet |
| 22 | 32 | 2 | 74 | 6% | BI |
| 23 | 46 | 0 | 0 | 0% | marketing |
| 24 | 46 | 0 | 0 | 0% | contracts |
| 25 | 58 | 0 | 0 | 0% | mobile |

**ממוצע ratio: 7.5%. חציון: 0%.**

### E2E / Integration

- **Playwright / Cypress:** 0 worktrees.
- **Integration tests מסומנים:** רק WT18 (תיקיית `tests/integration`).
- **API contract tests:** 0 (אין supertest, nock כן ב-WT18 לבד).

### TypeScript Strict Mode

- **Strict ON:** WT01, 02, 03, 04, 05, 06, 07, 12 (×2), 15 (×2), 17, 18, 19, 22, 23 (×2), 24 (×2), 25 (×2). **11 unique worktrees**.
- **Strict OFF / אין tsconfig:** WT08, 09, 10, 11, 13, 14, 16, 21 — בעיקר ה-JS-only.

### Hardcoded Secrets

- **לא נמצאו secrets ב-source code** — כל ה-API keys נטענים מ-`process.env`. נקודת חוזק.

### TODO/FIXME

- WT06: 2 קבצים
- WT12: 1 קובץ
- WT25: 1 קובץ
- כל השאר: 0 (לפי scanner; אבל יש "STUB"/"simulated" שלא נמדדו ככאלו ב-grep הקבוע).

### Mock Data / Seed Quality

- WT02 schema.prisma עם 1688 שורות יחד עם seed.ts — מציאותי.
- WT07 demo data ל-customer portal — נראה lorem ipsum-ish ("דמו").
- WT08 server/prisma/seed.js — לא נבדק בעומק.
- כדי לבדוק לעומק צריך להריץ seeders.

### RTL Hebrew Coverage

| WT | קבצים עם `dir="rtl"` | קבצים עם פונט עברי | הערכה |
|----|----------------------|-----------------------|--------|
| 01 | 2 | 1 (Heebo) | חלקי |
| 03 | 3 | 2 | חלקי |
| 04 | 1 | 0 | חסר פונט |
| 05 | 2 | 3 | טוב |
| 06 | 2 | 1 | חלקי |
| 08 | 2 | 2 | חלקי |
| 09 | 2 | 3 | טוב |
| 15 | 2 | 2 | חלקי |
| 22 | 1 | 1 | חלקי |
| 23 | 5 | 2 | טוב |
| 24 | 2 | 2 | חלקי |
| **25** | **0** | **0** | **חסר RTL במובייל!** |

---

## 5. טבלת מוכנות (Readiness Matrix)

| WT | מודול | Real? | Stub? | Mock? | טסטים | TS strict | בשלות לייצור |
|----|-------|-------|-------|-------|-------|-----------|--------------|
| 01 | Monorepo Sprint 0 | scaffold | ✓ | — | ✗ | ✓ | 10% |
| 02 | DB schema (Aneh) | schema only | ✓ | — | ✗ | ✓ | 5% |
| 03 | Auth + OAuth + 2FA | **✓ Real** | InMemory repo | — | 18% | ✓ | 60% |
| 04 | Audit Log | **✓ Real** | — | — | 9% | ✓ | 65% |
| 05 | CRM | **✓ Real** | — | — | **0%** | ✓ | 40% |
| 06 | Orders State Machine | **✓ Real** | — | — | 18% | ✓ | 70% |
| 07 | Customer Portal | Stub | **✓ Cardcom stub + sim'd kitchen** | — | 0% | ✓ | 25% |
| 08 | Menu & Pricing | JS, Express+Prisma | mail stub? | — | 2% | ✗ | 35% |
| 09 | Recipes & Pricing | Next+Prisma | — | seed | 0% | ✗ | 40% |
| 10 | Inventory | **sql.js (לא-prod)** | ✓ | — | 0% | ✗ | 15% |
| 11 | Suppliers + PO | JS, SQLite | **mail stub במפורש** | — | 0% | ✗ | 30% |
| 12 | **OCR Claude Vision + IMAP** | **✓ Real** | iCount duplicate | — | 10% | ✓ | 75% |
| 13 | Event Manager | JS stub | ✓ | — | 0% | ✗ | 10% |
| 14 | Logistics | **sql.js (לא-prod)** | ✓ | — | 0% | ✗ | 15% |
| 15 | HR + WebAuthn | **✓ Real (חצי)** | in-mem challenges | — | 0% | ✓ | 55% |
| 16 | Payroll | JS, README ריק | unknown | — | 0% | ✗ | ?20% |
| 17 | Finance Docs | **✓ Real** | חסר Allocation# | — | 16% | ✓ | 65% |
| **18** | **iCount** | **✓✓ Real** | — | — | **50%** | ✓ | **85%** |
| **19** | **CardCom** | **✓✓ Real** | — | — | 17% | ✓ | **80%** |
| 21 | Fleet | JS, README ריק | unknown | — | 0% | ✗ | ?25% |
| 22 | BI Reports | **✓ Real (SendGrid)** | — | — | 6% | ✓ | 60% |
| 23 | Marketing (4 providers) | **✓ Real** | simulated fallback | — | 0% | ✓ | 60% |
| 24 | Public Site + R2 Contracts | **✓ Real (R2)** | dev disk fallback | — | 0% | ✓ | 55% |
| 25 | Field Ops Mobile | **✓ Real (Watermelon)** | — | — | 0% | ✓ | 50% |

**מקרא:** Real = SDK/API חי. Stub = הצהרה מפורשת/placeholder. בשלות = הערכה משוכללת של [logic + integrations + tests + types].

---

## 6. רשימת Work-to-Finish — הערכת ימי עבודה

ממוין לפי קריטיות יורדת:

### קריטיות גבוהה (חוסם ייצור)

1. **WT07 → חיבור CardCom אמיתי במקום ה-stub** — ימים 2-3.
2. **WT15 → החלפת `Map` challenges store ל-Redis-backed** — יום 1.
3. **WT10 + WT14 → החלפת sql.js ל-Postgres (או לפחות better-sqlite3 עם native binding נכון)** — ימים 3-4.
4. **WT11 → mail stub אמיתי (SendGrid)** — יום 1.
5. **WT03 → InMemoryUserRepo → Postgres-backed** — יום 1.
6. **WT25 → ודא RTL + פונט עברי טעון ב-mobile** — ימים 1-2.

### קריטיות גבוהה (חוסר טסטים)

7. **WT05 (CRM, 37 source files, 0 tests)** — כתיבת unit tests לכל ה-routers, integration לבדיקות pipeline — ימים 5-7.
8. **WT09 (Recipes, 32 source files, 0 tests)** — חישובי FIFO, scaling, cost engine — ימים 4-5.
9. **WT15 (HR, 22 source files, 0 tests)** — כל ה-payroll/clock-in/swap workflow — ימים 4-5.
10. **WT23 (Marketing, 46 source files, 0 tests)** — 4 ספקים שונים (SendGrid/Twilio/019/WhatsApp) צריכים nock/MSW + retry tests — ימים 4-6.
11. **WT24 (Contracts, 46 source files, 0 tests)** — בדיקות חוזיות על PDF + R2 — ימים 3-5.
12. **WT25 (Mobile, 58 source files, 0 tests)** — Jest+Detox לכיסוי 6 roles + sync conflicts — ימים 6-8.

### קריטיות בינונית

13. **WT13 (Event Manager) + WT16 (Payroll) + WT21 (Fleet)** — README ריק; צריך לאמת מה עובד ולכתוב טסטים — 4-6 ימים *לכל worktree*.
14. **WT08 → המרה ל-TypeScript + strict** — ימים 3-4.
15. **כל ה-JS-only (10/11/13/14/16/21) → TypeScript** — ימים 8-12 בסה"כ.
16. **WT17 → הקצאת מספר הקצאה (Allocation#) לפי תקן 1346** — ימים 2-3.
17. **WT12 → איחוד עם iCount של WT18 (יש duplicate client)** — יום 1.
18. **WT01 Sprint 0 → השלמת ה-routes ו-tRPC/REST endpoints** — שבועות (Sprint 1-2 כולל).

### תשתית חוצת-מערכת

19. **E2E suite (Playwright)** על customer-portal + portal-admin + 4 critical flows — ימים 5-7.
20. **CI** עם `pnpm test --run` רבני על כל ה-monorepo — ימים 2-3.
21. **secrets vault** (Vault / Doppler) — תיעוד ובדיקה של 20+ env vars שונים — ימים 2.
22. **Hebrew font preload** במקומות החסרים (WT04, WT25) — יום 1.
23. **Sentry / observability** — לא נמצא בשום worktree — ימים 2-3.
24. **Rate limiting** מאוחד (קיים ב-WT03; חסר ב-12, 17, 22, 23, 24) — ימים 2.
25. **Bank statement upload (OFX/CSV)** — לא נכתב כלל; אם נדרש ל-WT17/22 — ימים 4-6.

### סיכום הערכה כוללת

- **לטיפול ב-stubs קריטיים בלבד:** ~12-15 ימי עבודה.
- **להגעה ל-test ratio סביר (>30%) בכל המודולים:** ~40-50 ימי עבודה נוספים.
- **השלמת ה-JS-only worktrees ל-TS + טסטים:** ~25-30 ימים.
- **תשתית CI/observability/secrets/E2E:** ~15-20 ימים.

**סה"כ להגעה לבשלות ייצור אמיתית של כל ה-24: כ-100-120 ימי עבודה (4-5 חודשי-מפתח full-time).**

---

## 7. ממצאים מיוחדים

### נקודות חוזק

- **WT18 (iCount), WT19 (CardCom), WT12 (OCR)** הם דוגמאות חיוביות מובהקות לאיך אינטגרציה צריכה להיראות: axios + zod + retry + logger + טסטים עם nock/mocks.
- **אפס secrets בקוד** — כל worktree משתמש ב-`process.env`.
- **Prompt caching ב-WT12** ממומש נכון לפי המדריך של Anthropic (cache_control ephemeral).
- **TypeScript strict** ב-11 worktrees הוא בסיס טוב.

### חולשות מערכתיות

- **0 E2E tests** בכל המערכת.
- **חציון test coverage = 0%** — 13 מתוך 24 worktrees ללא ולו טסט יחיד.
- **לא נמצאו integration tests בין שירותים** (CardCom + Customer Portal + Orders + iCount + OCR בלולאה אחת).
- **7 worktrees הם JavaScript טהור** ללא tsconfig — חוסר עקביות.
- **`webside-testter`** ב-7 README-ים הוא אינדיקציה לסוכנים שלא ביצעו את המשימה. עדיף לזהות אותם ולפנות מחדש.
- **bank integrations חסרות לחלוטין** — אם נדרש לחלק מהמערכת, זו פערה.

### סיכון משפטי/רגולטורי

- **חשבוניות ישראליות (תקן 1346):** WT17 מצהיר על תמיכה, אבל **Allocation Number (מספר הקצאה לפי תקנה 1346)** לא ראיתי ממומש. WT18 (iCount) כן מציע זאת ב-allocation-number.test.ts, אבל הוא מוגבל לזרימת iCount.
- **WT04 (audit log) טוב** — append-only עם retention של 7 שנים מתאים לדרישות.

---

## 8. המלצה כללית

המערכת מציגה תמונה בלתי-אחידה ביותר: ליבת התשלומים והחשבוניות (WT18, WT19) ו-OCR (WT12) הם רכיבים מוכנים יחסית לייצור, אבל **חצי מה-worktrees חסרים טסטים לחלוטין**, **7 worktrees לא הספיקו להיכתב כלל** (README "webside-testter"), ושני worktrees בוחרים sql.js כ-storage layer — בחירה לא-בטוחה לייצור.

לפני שמשחררים גרסה לפרודקשן, **קריטי** לבצע את הסעיפים 1-6 ברשימת work-to-finish (כ-13-16 ימי עבודה) ולהרים E2E suite מינימלי שמפעיל את הזרימה: לקוח מזמין → CardCom משלם → iCount מנפיק חשבונית → SendGrid שולח אישור.

</div>
