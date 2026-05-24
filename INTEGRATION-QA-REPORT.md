<div dir="rtl">

# דוח QA אינטגרציה — פלטפורמת קייטרינג (24 Worktrees)

**תאריך:** 2026-05-11
**סוכן:** QA אינטגרציה — סריקה רוחבית של כל ה-Worktrees
**מטרה:** זיהוי פערי אינטגרציה לפני מיזוג ל-`main`

---

## תקציר מנהלים (TL;DR)

המערכת **לא מוכנה למיזוג ל-main**. כל אחד מ-24 ה-worktrees נבנה כ-greenfield עצמאי ללא חוזה משותף, ללא חבילה משותפת, וללא הסכמה על שכבת תשתית:

- **שני פרויקטים שונים מעורבבים**: Worktrees `01`, `02`, `03`, `04` מימשו פלטפורמת "ענה את השואל" (Q&A רבני), בעוד שאר ה-worktrees מימשו מערכת קייטרינג / ERP. אלה **אינם אותו מוצר**.
- **אפס שיתוף קוד**: לא נמצא ולו ייבוא יחיד של חבילה משותפת (`@aneh/*`, `@aneh-hashoel/*`, `@field-ops/*`, `@integrations/*`) בין worktree לשני.
- **5 ORMs / DBs שונים**: Prisma + PostgreSQL, Drizzle + PostgreSQL, sql.js (SQLite בזיכרון), JSON files, in-memory.
- **3 כינוסים שונים של מודל `Order`**, **5 מודלים שונים של `Customer`**, **3 מודלים שונים של `Invoice`** — אין שדה מפתח משותף שיאפשר רפליקציה / סנכרון.
- **04 (Audit)** מימש Prisma middleware לפלטפורמת Q&A, **לא** למודולי הקייטרינג; אף מודול לא מחובר אליו.
- **03 (Auth)** מימש מערכת JWT עשירה ב-`@aneh/auth`, אך אפס מודולי קייטרינג צורכים אותה — חמישה מודולים (15, 17, 21, 22, ועוד) הגדירו JWT לבדם עם סוד שונה ופלואו שונה.

**אין שום פיצ'ר אצל המשתמש הסופי שיעבוד מקצה-לקצה במצב הנוכחי.**

---

## חלק 1: מפת ה-Worktrees

| # | תיאור עסקי | שם packages | DB | שם החבילה | מספר schema models | נקרא בידי |
|---|------------|-------------|-----|-----------|---------------------|------------|
| 01 | תשתית | `apps/{web,customer-portal,public-site,mobile}` + `packages/{db,auth,api,ui,integrations,utils}` | Drizzle/PG | `aneh-hashoel-monorepo` | 3 (users, questions, answers) | אף אחד |
| 02 | DB Prisma | `packages/db/prisma/schema.prisma` | Prisma/PG | `aneh-hashoel-monorepo` | **57 models + 26 enums** (4072 lines) | אף אחד |
| 03 | Auth | `apps/web` + `packages/auth` | In-memory | `@aneh/web` / `@aneh/auth` | n/a | אף אחד |
| 04 | Audit | root | Prisma/PG | `audit-log-system` | 4 (User, Question, Answer, AuditLog) | אף אחד |
| 05 | CRM | root | Prisma/PG | `crm` | 14 models | עצמאי |
| 06 | הזמנות | root | Prisma/**SQLite** (`file:./dev.db`) | `orders-management` | 13 models | עצמאי |
| 07 | פורטל | `apps/customer-portal` | **in-memory store** | `customer-portal` | n/a | עצמאי |
| 08 | תפריטים | `client/` + `server/` | Prisma/SQLite | `client` | 22 models | עצמאי |
| 09 | מתכונים | root | Prisma/SQLite | `kitchen-recipes` | 8 models | עצמאי |
| 10 | מלאי | `inventory/` | sql.js (SQLite RAM) | `inventory` | 13 tables, snake_case+PascalCase mix | עצמאי |
| 11 | ספקים | root | sql.js | `suppliers-po-system` | 8 tables, snake_case | עצמאי |
| 12 | OCR | `apps/{api,web-verify}` + `packages/integrations/ocr` | n/a (queues) | `@invoice-ocr/api` | n/a | עצמאי |
| 13 | אירועים | `event-manager/` | **JSON files** | `event-manager` | 8 "טבלאות" JSON | עצמאי |
| 14 | לוגיסטיקה | `logistics/` | sql.js | `logistics-delivery` | 9 tables | עצמאי |
| 15 | HR | `server/` + `client/` | Prisma/PG | `hr-client` | 9 models | עצמאי |
| 16 | שכר | `payroll-system/` | **אין DB** (חישוב only) | `payroll-system` | אין | עצמאי |
| 17 | חשבוניות | `finance-docs/` | Prisma/PG | `finance-docs` | 11 models | עצמאי |
| 18 | iCount | `packages/integrations/icount` | n/a (queue) | `@aneh-hashoel/icount` | n/a | עצמאי |
| 19 | Cardcom | `packages/integrations/cardcom` | SQL schema | `@integrations/cardcom` | 4 tables | עצמאי |
| 21 | צי רכב | `fleet/{api,web,mobile,shared}` | Prisma/PG | `fleet-api` | 7 models | עצמאי |
| 22 | BI | root | Prisma/PG | `bi-reports` | 18 models | עצמאי |
| 23 | שיווק | `marketing-platform/{server,client}` | Prisma/PG | `@marketing/client` | 24 models | עצמאי |
| 24 | אתר ציבורי | `apps/public-site` + `packages/contracts` | n/a (webhook) | `public-site` | n/a | עצמאי |
| 25 | Mobile | `apps/mobile` + `packages/ui` | WatermelonDB | `@field-ops/mobile` | n/a | עצמאי |

> **הערה דרמטית:** כל worktree מגדיר monorepo משלו, אבל אף אחד מהם **לא משתתף** ב-monorepo אחר. אין `pnpm-workspace.yaml` משותף. מיזוג כל ה-`packages/` מ-24 worktrees ל-`main` יוצר 24 packages.json נפרדים, רובם חופפים בשמות.

---

## חלק 2: Schema Clash

### 2.1 ORM ו-DB drivers שונים

| ORM/Driver | מודולים | בעיה |
|------------|---------|------|
| Drizzle + Postgres | 01 | יחיד |
| Prisma + Postgres | 02, 04, 05, 15, 17, 21, 22, 23 | "Canonical" |
| Prisma + SQLite (file:./dev.db) | 06, 08, 09 | **לא תואם פרודקשן** |
| sql.js (SQLite-in-memory) | 10, 11, 14 | **כל restart איבוד נתונים** |
| JSON file store | 13 | לא scalable |
| in-memory Map | 03 (auth), 07 (portal) | demo בלבד |
| WatermelonDB (mobile) | 25 | אין sync backend מוגדר |
| ללא DB | 16 (payroll), 12 OCR queues | תלוי-DB חיצוני שלא נבנה |

**מסקנה:** לא ניתן להריץ את המערכת על מסד אחד. החלפת SQLite ל-Postgres ב-06, 08, 09 צפויה לגלות באגי-טיפוסי (Float vs Decimal, אין `@db.Citext`).

### 2.2 קונפליקטים במודלי-יסוד

#### Customer — חמש הגדרות שונות, כולן מתחזות "מקור-אמת":

| Worktree | מפתח | שדות עיקריים | tenantId | סוג מפתח |
|----------|------|---------------|----------|-----------|
| 02 (canonical) | `id` | tenantId, type, name, hebrewName, taxId, email(Citext), phone, creditLimit, paymentTermDays | ✅ Required | uuid |
| 05 (CRM) | `id` | type, status, displayName, companyName, taxId, churnScore, upsellScore, ltv | ❌ | cuid |
| 06 (Orders) | `id` | fullName, **phone (unique!)**, email, address, city | ❌ | cuid |
| 08 (Menus) | `id` | name, email (unique), phone, type(string), loyaltyPoints, loyaltyTier | ❌ | uuid |
| 17 (Finance) | `id` | **orgId**, name, taxId, email, phone, whatsapp, status | ❌ (יש orgId במקום) | cuid |
| 22 (BI) | `id` | name, taxId, agentId, category | ❌ | cuid |

**מסקנה:** לקוח שמוזמן דרך 07 (פורטל), מקבל הזמנה ב-06, מקבל חשבונית ב-17 — שלוש רשומות שונות. אין שדה מפתח משותף (phone לא קיים ב-22, taxId לא חובה באף מקום, email לא unique ב-06).

#### Order — שלוש סכמות שונות:

| Worktree | שדות עיקריים | מצב משלם |
|----------|---------------|------------|
| 02 master | `OrderItem` קיים אך **אין `Order` הראשי!** | - |
| 06 Orders | orderNumber, type (5 values), status (8 values), channel, **payment via separate model** | invoice via internal Effect |
| 08 Menus | orderNumber, customerId, packageId, eventDate, **subtotal/discount/total as Float**, loyaltyRedeemed | אין |

ב-02 (sschema canonical) יש רק `OrderItem` ללא `Order` — חסר entity מרכזי.
ב-06 ההזמנה לא יודעת על package/coupon/loyalty של 08 ולהפך.

#### Invoice — שלושה schemas, אף אחד לא תואם iCount:

| Worktree | שדה מספר | tag רשמי/לא-רשמי | סטטוסים | אטומיות |
|----------|-----------|---------------------|----------|---------|
| 02 master | `invoiceNum: String` | `category: FinancialCategory(OFFICIAL/UNOFFICIAL)` | DRAFT/SENT/PAID/PARTIALLY_PAID/OVERDUE/CANCELLED | Decimal(14,2) |
| 06 Orders | `invoiceNumber: String unique` (auto: `INV-${ts}-rnd`) | אין | אין enum | **Float** |
| 17 Finance | `number: String` (unique per (orgId,type)) | `tag: DocTag(OFFICIAL/UNOFFICIAL)` | 8 ערכי DocStatus | Decimal(14,2) |
| 22 BI | `number: String` | `isOfficial: Boolean` | DRAFT/OPEN/PAID/VOID/OVERDUE | Decimal(14,2) |
| 18 iCount (DTO) | enum DocumentType (9 ערכים) | enum DocumentStatus | DRAFT/ISSUED/CANCELLED | n/a |

**מסקנה:** הזרימה `06→17→18 iCount` (חוק 1346 — מספר הקצאה) שבורה:
- 06 מייצר Invoice ב-DB **המקומי שלו** (SQLite) ב-`applyEffects` ולא יודע על 17.
- 17 לא יודע על orderId, רק על customerId.
- 18 iCount מצפה ל-DTO שלו (`DocumentType`) שאינו מופיע כלל ב-06 ו-17.

#### User / Role — אנרכיה מוחלטת

| מודול | סוג Role | ערכים |
|-------|---------|--------|
| 02 (canonical) | אין enum Role | rolesm via `Role`+`UserRole` join | 
| 03 (Auth canonical) | RBAC matrix | general_manager, finance, ...| 
| 04 (Audit) | enum UserRole | RABBI, EDITOR, GENERAL_ADMIN, USER (פלטפורמת Q&A!) |
| 05 (CRM) | String | "agent" \| "manager" \| "admin" |
| 15 (HR) | enum Role | EMPLOYEE + מה שבכלל לא מוגדר במאסטר |
| 17 (Finance) | enum Role | VIEWER ועוד |
| 21 (Fleet) | enum UserRole | DRIVER ועוד |
| 22 (BI) | enum Role | VIEWER ועוד |
| 23 (Marketing) | enum UserRole | MARKETER ועוד |
| 01 + Drizzle | varchar(32) | "asker" \| "rabbi" \| "editor" \| "admin" (Q&A!) |

**אין ערך תפקיד יחיד שמופיע בכל המודולים.** מנהל-כללי ב-03 ⇄ GENERAL_ADMIN ב-04 ⇄ admin ב-05 ⇄ אין ב-15.

### 2.3 סוגי מפתחות לא תואמים (CUID vs UUID)

- 02 + 04 + 08: `@db.Uuid`
- 05, 06, 09, 15, 17, 21, 22, 23: `@default(cuid())`

המשמעות: גם אילו היו טבלאות עם FK בין-מודולים, FK ל-CUID לא יתאים לעמודת UUID. **מיזוג חוצה-מודולים ל-DB יחיד ידרוש בחירה ומיגרציה גלובלית של כל המזהים.**

### 2.4 קונבנציית שמות עמודות מעורבת

- 02 (master): `snake_case` עם `@map`
- 05, 06, 08, 09, 15, 17, 21, 22, 23: `camelCase` ישיר (Prisma default)
- 10, 11, 14: SQL ישיר עם `snake_case` ב-11, 14 לעומת `PascalCase` ב-10
- 11 משתמש ב-`suppliers`, ובאותו זמן 10 משתמש ב-`Supplier` (יחיד+PascalCase).

### 2.5 מסכמה 02 חסרה כליל

חרף 4072 שורות ו-57 מודלים, **חסרים מודלים קריטיים** ב-02:
- אין `Order` (יש רק `OrderItem`)
- אין `Subscription`
- אין `KitchenTask` / `Recipe`-version
- אין `Coupon`, `LoyaltyEntry`, `Package`, `CustomerPriceList`
- אין `PurchaseOrder` של ספק (יש בלי FK הולם)
- אין `Driver` / `Geofence` / `DeliveryProof`

לפיכך **גם אם נחליט ש-02 הוא Source of Truth**, יחסרו ~50% מהמודלים שמודולי הדומיין באמת צריכים.

---

## חלק 3: Type Contracts (API בין-מודולים)

### 3.1 06 הזמנות → 17 חשבוניות → 18 iCount

- **06** מייצר Invoice **בתוך DB SQLite שלו** (`applyEffects.ts:case 'invoice.create'`) עם `orderId, invoiceNumber, totalAmount, taxAmount`.
- **17** מצפה ל-`Document` עם `orgId, customerId, type(DocType), tag(DocTag), number, subtotal, vatRate, vatAmount, total, paidAmount, balance`.
- **18 iCount** מצפה ל-`ICountConfig` + `DocumentType.TAX_INVOICE`/`INVOICE_RECEIPT`/`RECEIPT` עם payload תואם רשות-מסים (מספר-הקצאה, חתימה דיגיטלית).

**אין mapping/adapter** בין שלושת המודולים. שום שורת קוד אחת לא מקשרת אותם.

### 3.2 06 הזמנות → 09 מטבח → 10 מלאי

- **06** מייצר `KitchenTask` ב-DB SQLite שלו.
- **09** יש מודל `PrepTask` משלו, לא `KitchenTask`, ומקושר ל-`Event` ולא ל-`Order`.
- **10** מלאי משתמש ב-`BOM` (Bill of Materials), טבלת `Product`, אבל אין FK ל-`Recipe.id` של 09 או ל-`OrderItem.id` של 06.

**שורש לקוי לחלוטין:** הזמנה לא יוצרת הפחתת מלאי. מתכון לא יודע מאיזה ספק.

### 3.3 06 הזמנות → 14 לוגיסטיקה

- **06** יש `Delivery` עם `orderId, address, scheduledAt`.
- **14** יש טבלת `deliveries` בעלת קוד שונה לחלוטין (`vehicle_id, driver_id, status_log`). אין `order_id`!
- 14 מצפה לכאורה לקבל POST/REST ולא יודע מה זה הזמנת-קייטרינג.

### 3.4 23 שיווק → 05 CRM

- **23** מודל `Lead` (consentEmail, consentSms, tags, attributes).
- **05** מודל `Lead` שונה לחלוטין (title, description, source enum, status enum, value, currency, UTM).
- **אין סנכרון** — ליד שנוצר במערכת שיווק (23) לא יגיע ל-CRM (05).

### 3.5 07 פורטל → 06 הזמנות / 08 תפריטים / 19 cardcom

- **07** משתמש ב-**in-memory `db()` store** (`@/lib/store`).
- כל המשיכה מהתפריט (`/api/menu/route.ts`) קוראת מ-store פנימי, לא מ-08.
- צ'קאוט (`/api/checkout/cardcom/route.ts`) מחזיר URL פייק (`/checkout?orderId=...`), לא קורא ל-19 Cardcom בכלל.
- הזמנה (`/api/orders/route.ts`) נשמרת ב-store פנימי, לא מגיעה ל-06.

**הפורטל מנותק מ-100% מהמערכת.**

### 3.6 25 Mobile → backend

- `apps/mobile/src/services/api.ts` קורא ל-`https://api.fieldops.example.com` — אין שום backend שאחראי על endpoint זה.
- אין API ב-21 (fleet) שעונה ל-mobile (יש `fleet-api` אבל לא חשוף ב-`apiBaseUrl`).
- שם החבילה `@field-ops/mobile` מצביע על שם פרויקט שלישי שאינו אחיד עם השאר.

---

## חלק 4: ENV Vars — קונפליקטים וכפילויות

### 4.1 ערכי DATABASE_URL

| Worktree | DATABASE_URL | DB name |
|----------|---------------|---------|
| 01 | `postgresql://aneh:aneh_dev_password@localhost:5432/aneh_hashoel` | `aneh_hashoel` |
| 02 | `postgresql://aneh_user:aneh_pass@localhost:5432/aneh_hashoel` | `aneh_hashoel` (משתמש שונה!) |
| 04 (audit) | `postgresql://app_user:CHANGE_ME@localhost:5432/aneh_hashoel` | `aneh_hashoel` |
| 05 (CRM) | `postgresql://user:pass@localhost:5432/crm` | **crm** |
| 06 (Orders) | `file:./dev.db` | SQLite |
| 08 (Menus) | `file:./dev.db` | SQLite |
| 09 (Recipes) | `file:./dev.db` | SQLite |
| 15 (HR) | `postgresql://user:password@localhost:5432/hr_platform` | **hr_platform** |
| 17 (Finance) | `postgresql://user:pass@localhost:5432/finance_docs` | **finance_docs** |
| 19 (Cardcom) | `postgres://user:pass@localhost:5432/cardcom` | **cardcom** |
| 21 (Fleet) | `postgresql://postgres:postgres@localhost:5432/fleet` | **fleet** |
| 22 (BI) | `postgresql://user:pass@localhost:5432/bi` | **bi** |
| 23 (Marketing) | `postgresql://postgres:postgres@localhost:5432/marketing` | **marketing** |

**מסקנה:** במצב הנוכחי יידרשו לפחות **8 בסיסי-נתונים נפרדים** רק כדי להפעיל לוקלית. אין הסכמה: היחיד.

### 4.2 JWT_SECRET — 5+ סודות נפרדים

| מודול | משתנה | ערך default |
|-------|---------|--------------|
| 01 | `JWT_SECRET` | `replace_with_random_64_char_string` |
| 03 (auth) | משתנה דרך `config/index.ts` | — |
| 04 (audit) | `JWT_SECRET` | `CHANGE_ME_TO_A_LONG_RANDOM_STRING_AT_LEAST_32_BYTES` |
| 05 (CRM) | `NEXTAUTH_SECRET` (NextAuth!) | — |
| 06 (Orders) | `NEXTAUTH_SECRET` | — |
| 15 (HR) | `JWT_SECRET` + `ENCRYPTION_KEY` (AES) | — |
| 17 (Finance) | `JWT_SECRET` | "change-me" |
| 21 (Fleet) | `JWT_SECRET` | "change-me-in-production" |
| 23 (Marketing) | `JWT_SECRET` | "change_me_in_production" |

**05 ו-06 משתמשים ב-NextAuth, 15/17/21/23 ב-jsonwebtoken ישיר** — תוקן ב-token שיונפק ע"י 05 לא יקובל ב-17.

### 4.3 REDIS_URL — שני pattern-ים שונים

- 01, 04, 12, 15, 17, 19, 22, 23 → `redis://localhost:6379`
- 05 → `redis://localhost:6379` (כן, אבל לא משמש)

עקבי-יחסית. אבל אין `REDIS_PREFIX` אחיד, כך שכל מודול ייצור keys שיתנגשו (`bullmq:queue:*`).

### 4.4 שכפול תצורת ספקי-שירות

- **Cardcom**: 07 פורטל מגדיר `CARDCOM_TERMINAL_NUMBER, CARDCOM_USERNAME, CARDCOM_API_PASSWORD`; 19 מגדיר `CARDCOM_TERMINAL, CARDCOM_USERNAME, CARDCOM_API_NAME, CARDCOM_API_PASSWORD + 6 endpoints`. **שמות שונים** (`TERMINAL` vs `TERMINAL_NUMBER`).
- **iCount**: 12 (OCR) מגדיר `ICOUNT_COMPANY_ID, ICOUNT_USER, ICOUNT_PASSWORD, ICOUNT_BASE_URL`; 18 (iCount) משתמש ב-`ICountConfig.apiKey` (פרמטר!) — אין הסכמה אם זה user/pass או apiKey.
- **Anthropic**: 12 ו-23 שניהם מגדירים `ANTHROPIC_API_KEY` — אין סיבה לכפילות.
- **SendGrid**: 22 BI ו-23 שיווק שניהם מגדירים `SENDGRID_API_KEY, SENDGRID_FROM` — אין סיבה לכפילות.

### 4.5 ENV חסרים לחלוטין

מודולים ללא `.env.example`:
- 03 Auth, 09 Recipes (יש partial), 10 Inventory, 11 Suppliers, 13 Events, 14 Logistics, 16 Payroll, 18 iCount, 24 Public Site (יש), 25 Mobile.

---

## חלק 5: Shared Packages — אין

חיפוש ייבואים של חבילות משותפות (`@aneh/*`, `@aneh-hashoel/*`, `@integrations/*`, `@field-ops/*`) מ-worktree אחד לשני:

```bash
grep -rln "@aneh/(db|auth|ui|api|utils)" \
  worktrees-של-06,05,17,...src/
# => 0 תוצאות
```

- **01** הגדיר `@aneh/{db,auth,ui,api,integrations,utils}` — אף אחד לא משתמש בהם.
- **02** הגדיר `@aneh/db` (Prisma) — אף אחד לא משתמש בו.
- **03** הגדיר `@aneh/auth` עם RBAC matrix מלא — אף אחד לא משתמש בו.
- **18** הוא `@aneh-hashoel/icount` — אף אחד לא משתמש.
- **19** הוא `@integrations/cardcom` — אף אחד לא משתמש.
- **24** הגדיר `packages/contracts` (PDF/templates) — אף אחד לא משתמש.

**מסקנה:** כל ניסיון מיזוג ידרוש או (א) הקפצה של ה-import paths בכל מודול לחבילות-משותפות, או (ב) שמירה על דובלקציה ותקלות אבטחה.

---

## חלק 6: אינטגרציית Auth (03 → 05-25)

03 בנה מערכת `@aneh/auth` כוללת:
- JWT (jsonwebtoken)
- Argon2 password hashing
- TOTP + SMS 2FA (otplib, twilio)
- OAuth (Google, Facebook) דרך passport
- Helmet + rate-limit-redis
- RBAC 4 רמות עם black/white lists ו-categories official/unofficial
- AES-256-GCM encryption מובנה
- AsyncLocalStorage לקונטקסט

**אף מודול אחד לא צורך אותו.** כל אחד מבני 15/17/21 כתב לעצמו middleware מינימליסטי של `jwt.verify(token, JWT_SECRET)` ועם payload שונה (`role` הוא string פשוט). אין שום חוזה לפיענוח ה-token.

תוצאה: token שנוצר ב-03 לא יקובל בשום API אחר; token שנוצר ב-15 לא יזוהה ע"י 03; אין SSO.

---

## חלק 7: Audit Log (04)

04 בנה תשתית רצינית:
- `audit_logs` append-only עם trigger PostgreSQL שחוסם UPDATE/DELETE
- Row-Level Security: רק `GENERAL_ADMIN` רואה
- Prisma middleware שתופס כל CREATE/UPDATE/DELETE
- AsyncLocalStorage לזיהוי משתמש בכל קונטקסט
- Retention 7 שנים
- ייצוא CSV/PDF

**אבל:**
1. ה-User/Role ב-04 הם של פלטפורמת Q&A (RABBI/EDITOR/USER), לא של קייטרינג.
2. ה-Prisma middleware מותקן רק ב-PrismaClient של 04, לא ב-PrismaClient של 05/06/15/17 וכו'.
3. אף מודול לא קורא ל-`recordSensitiveRead` או ל-`recordPermissionDenied`.

**במצב הנוכחי האודיט לא רושם כלום מהפעילות העסקית של הקייטרינג.**

---

## חלק 8: בעיות זיהוי-זהות (Identity Mismatch)

עיון מעמיק בחומר חושף שלפחות **4 worktrees שייכים לפרויקט אחר** — "ענה את השואל" (Q&A רבני):
- **01** — Drizzle schema של `users(role: asker|rabbi|editor|admin)`, `questions`, `answers`.
- **02** — README + schema תיאור "ERP/CRM for catering, events, **and rabbinical Q&A management**".
- **03** — `@aneh/auth` עם session schema של `userId, role: asker|rabbi|editor|admin, email`.
- **04** — schema של `User/Question/Answer/AuditLog` ל-Q&A. UserRole = `RABBI|EDITOR|GENERAL_ADMIN|USER`.

הסיבה היא ככל הנראה ש-memory `project_aneh_hashoel.md` השפיע על Sprint 0 של התשתית, ואחר-כך הוחלפה הדומיין למערכת קייטרינג מבלי לחזור ולהתאים את 01-04. **זה blocker גורף.**

---

## חלק 9: סוגיות אבטחה ותפעול

- **04** מצפה למיגרציה כ-`DATABASE_ADMIN_URL` (postgres superuser) — אם מודולים אחרים מריצים `prisma migrate` עם משתמש רגיל הם **ישברו את ה-trigger** של append-only audit.
- **06** משתמש ב-`Float` לכספים — דיוק לקוי. תוצאות `subtotal + tax` יסתבכו במע"מ.
- **13 events** ב-JSON file ללא locking — race condition.
- **10/11/14** ב-sql.js — איבוד נתונים בכל restart.
- **23 marketing** מחזיק tokens של Meta, Google Ads, Twilio, WhatsApp, SendGrid — אין הצפנת secrets, אין vault.
- **15 HR** מצפה ל-`ENCRYPTION_KEY` 64 hex chars (AES-256-GCM) ל-PII — אבל אין WAY להצפין רטרואקטיבית.

---

## בלוקרים קריטיים למיזוג ל-main (חייב לפתור לפני merge)

### B1 — שני פרויקטים מעורבבים
01, 02, 03, 04 מימשו פלטפורמת Q&A; היתר מימשו קייטרינג. אי-אפשר למזג אותם כפי שהם.
**פעולה:** או (א) להפריד 01-04 ל-monorepo נפרד של Q&A, או (ב) לכתוב מחדש 01-04 בלי שאריות Q&A.

### B2 — אין DB יחיד
8 בסיסי-נתונים שונים (`aneh_hashoel`, `crm`, `hr_platform`, `finance_docs`, `cardcom`, `fleet`, `bi`, `marketing`) + 3 SQLite + 3 sql.js + JSON + in-memory.
**פעולה:** החלטה: monorepo עם DB יחיד או מיקרו-שירותים עם DBs נפרדים + event-bus. בלי החלטה — מיזוג ל-main בלתי-אפשרי.

### B3 — אין חוזה Customer/Order/Invoice
5 הגדרות שונות של `Customer` ללא מפתח-זהות משותף; 3 הגדרות `Order`; 4 הגדרות `Invoice`.
**פעולה:** להגדיר `packages/contracts` (TypeScript types + zod schemas) שכל מודול חייב לייבא ולא לשכפל מקומית.

### B4 — אין integration בין 06↔09↔10↔14
המסלול הקריטי: הזמנה → הכנת מטבח → קיטון מלאי → תכנון משלוח — שבור לחלוטין. אין FK, אין שדה משותף, אין event-bus.
**פעולה:** הגדרת outbox + event-bus (RabbitMQ/Kafka/Redis Streams) או DB יחיד עם FK חוצה-מודולים.

### B5 — אין integration 06→17→18 (חשבוניות-מס)
חוק 1346 דורש מספר-הקצאה ב-iCount. כיום 06 מייצר חשבונית פנימית; 17 לא יודע על זה; 18 לא מקבל קלט.
**פעולה:** webhook/queue מ-06 ל-17 שייצר Document, ואחריו 18 שיוציא חשבונית-מס לרשות המסים. ללא זה — **הפעלה בפרודקשן בלתי-חוקית**.

### B6 — אין Auth אחיד
03 בנה `@aneh/auth` אבל אף מודול לא משתמש; 9 מודולים מימשו JWT עצמאי עם סודות שונים. אין SSO.
**פעולה:** או לדרוש מכל מודול לעבור ל-`@aneh/auth`, או להגדיר OAuth2/OIDC חיצוני (Keycloak) שכולם מאמתים מולו.

### B7 — Audit מנותק
04 מתעד פעולות של Q&A, לא של קייטרינג. אין Prisma middleware במודולי 05-23.
**פעולה:** הזרמת ה-middleware של 04 לחבילה משותפת + שילוב ב-`PrismaClient` של כל מודול + עדכון 04 ל-Role-set של קייטרינג.

### B8 — Float לכסף
06 משתמש ב-`Float` לסכומים. מע"מ ישראלי 17% + עיגול → אי-דיוק.
**פעולה:** מיגרציה ל-`Decimal(14,2)` (כפי שכל שאר המודולים).

### B9 — סוגי מפתחות לא תואמים (CUID vs UUID)
9 מודולים ב-cuid, 3 ב-uuid. FK חוצה-מודולים בלתי אפשרי.
**פעולה:** החלטה. ההמלצה: uuid (תואם 02 master + PostgreSQL native).

### B10 — Mobile ללא backend
25 מצפה ל-`api.fieldops.example.com` שלא קיים. WatermelonDB sync לא מוגדר.
**פעולה:** חיבור 25 ל-21 (fleet API) או הקמת gateway.

---

## בלוקרים בינוניים (כדאי לפני merge, אבל אפשר חודש אחרי)

### M1 — sql.js / JSON store
10, 11, 13, 14 שומרים נתונים בזיכרון/JSON. בכל restart איבוד.
**פעולה:** הגירה ל-Prisma/PostgreSQL לפני go-live.

### M2 — שכפול תצורות
שמות `CARDCOM_TERMINAL` vs `CARDCOM_TERMINAL_NUMBER`, `ICOUNT_USER` vs `ICountConfig.apiKey`.
**פעולה:** שכבת `packages/config` שמייצאת types בודקי-טעות לכל ENV.

### M3 — אין enum משותף ל-PaymentMethod / Status
ערכים שונים בכל מודול: CHECK ב-17 ייצוא ל-02 שלא תומך בו.
**פעולה:** הגדרת enums ב-`packages/contracts`.

### M4 — tenantId רק ב-02 ו-04
שאר המודולים חד-טננט; פתיחת שירות multi-tenant ידרוש refactor.
**פעולה:** הוספת `tenantId String?` לכל מודל (לפחות כ-nullable, ל-future-proofing).

### M5 — 05↔23 Leads מנותקים
ליד שיווקי לא מגיע ל-CRM. שום webhook.
**פעולה:** event `LeadCreated` ב-23 ש-05 צורך.

### M6 — 13 Events ב-JSON
אין concurrency-safety. שניים שעורכים אירוע באותו זמן → איבוד נתונים.
**פעולה:** הגירה ל-Prisma + טבלת `Event` של 02.

### M7 — 16 Payroll ללא DB
מחשב משכורת ללא persistence. ה-output רק ב-`output/`.
**פעולה:** חיבור ל-DB ול-`PayrollRecord` של 02.

### M8 — 04 RLS דורש superuser
מודולים שלא יודעים על ה-trigger ייפלו על INSERT/UPDATE/DELETE לא-מותר.
**פעולה:** תיעוד migration order + מתן הרשאות.

### M9 — Redis prefix משותף
אין `BULLMQ_PREFIX` אחיד; queue keys מתנגשים.
**פעולה:** הגדרת `QUEUE_PREFIX=catering` לכל worker.

### M10 — אין Docker compose משותף
01 בלבד מגדיר `docker/`. שאר ה-23 ידרשו docker-compose משותף או deployment manifests.
**פעולה:** הקמת compose עם כל ה-services.

---

## שיפורים מומלצים

- **S1** — `packages/contracts` משותף לכל הטיפוסים העסקיים (Customer, Order, Invoice, Lead, Event).
- **S2** — `packages/db` יחיד עם Prisma schema אחד (לאחד את 02 + תוספות מ-05-23).
- **S3** — `packages/auth` יחיד (לאחד את 03 + שאריות מ-15/17/21/22/23).
- **S4** — `packages/audit` יחיד (העברת middleware מ-04).
- **S5** — `packages/queue` משותף (BullMQ wrapper) עם prefix אחיד.
- **S6** — Turborepo / pnpm workspace יחיד עם 24 apps + ~10 packages.
- **S7** — OpenAPI / tRPC רישום של כל endpoint, עם codegen של clients.
- **S8** — CI: typecheck חוצה-workspace שמזהה שינויי schema.
- **S9** — Terraform / Pulumi להקמת תשתית (PG, Redis, R2, MinIO, ייצור).
- **S10** — Storybook / חבילת `packages/ui` משותפת — היום `01` ו-`25` הגדירו 2 חבילות `ui` שונות.
- **S11** — feature-flags אחידים — היום 02 ו-22 שניהם יש להם `FeatureFlag` model.
- **S12** — i18n: 24 worktrees → 24 קבצי-לוקליזציה עברית. חיפוש אחד `packages/i18n`.
- **S13** — מספור גרסאות אחיד לכל ה-packages (semantic-release).
- **S14** — בדיקות-E2E חוצות-מודולים (Playwright/Cypress) — היום אין.

---

## סיכום ההמלצה

מצב נוכחי: **24 מערכות נפרדות שאינן יוצרות מערכת אחת**.

**אופציות לדרך-המשך:**

1. **Big-bang refactor**: סוכן יחיד מאחד הכל ב-pnpm workspace, עם `packages/{contracts,db,auth,audit,ui,queue}`, ובכל worktree מחליפים ייבואים מקומיים בייבוא מהמשותפים. אומדן: 80-120 שעות עבודה.

2. **Strangler pattern**: מיזוג מודול-מודול, כשבכל שלב מגדירים adapter שמתרגם בין שמות-שדות. אומדן: 4-6 חודשים, אבל יוצר חוב טכני מתמשך.

3. **Microservices + Event Bus**: כל מודול נשאר עם DB משלו, אבל מוסיפים shared event-bus (RabbitMQ/Kafka) + API Gateway + OAuth2 server מרכזי (Keycloak). אומדן: 60-80 שעות, פחות פגיע אבל יקר תפעולית.

ההמלצה: **אופציה 1** עם החלטה מוקדמת על:
- DB יחיד (Postgres)
- ORM יחיד (Prisma)
- מפתח יחיד (UUID)
- Auth יחיד (`@aneh/auth` ב-03, מורחב לתפקידי קייטרינג)
- Audit יחיד (04 middleware בכל PrismaClient)
- `packages/contracts` מחייב

ללא לפחות פתרון ל-**B1–B7**, מיזוג ל-`main` ייצור branch שאף אחד לא יכול להריץ.

</div>
