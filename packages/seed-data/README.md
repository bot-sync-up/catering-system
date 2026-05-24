# @aneh/seed-data

נתוני seed עבריים ריאליסטיים לפלטפורמת **ענה את השואל** / **קייטרינג טעימים** — מולטי-טננט ERP/CRM.

## תוכן עניינים

- [התקנה](#התקנה)
- [שימוש](#שימוש)
- [קני מידה](#קני-מידה)
- [ה-tenant — קייטרינג טעימים](#ה-tenant--קייטרינג-טעימים)
- [מבנה הנתונים](#מבנה-הנתונים)
- [איפוס](#איפוס)
- [בדיקות](#בדיקות)
- [ארכיטקטורה](#ארכיטקטורה)

---

## התקנה

```bash
cd packages/seed-data
npm install
```

ה-package תלוי ב-`@prisma/client` של המונורפו (חבילה אחות `packages/db`).
ודאו שהוגדר `DATABASE_URL` בסביבה לפני ההרצה.

## שימוש

### Master seed

```bash
# קנה מידה קטן (לפיתוח, ~10%)
tsx prisma/seed.ts --tenant=demo --scale=small

# בינוני (staging, ~50%)
tsx prisma/seed.ts --tenant=demo --scale=medium

# מלא (demo, 100%)
tsx prisma/seed.ts --tenant=demo --scale=large
```

או דרך npm scripts:

```bash
npm run seed:small
npm run seed:medium
npm run seed:large
```

### דוגמת פלט

```
[seed] 🌱 התחלת זריעה — tenant="demo", scale="medium"
[seed] ✅ tenant: קייטרינג טעימים
[seed] ✅ roles + permissions
[seed] ✅ 12 users
[seed] ✅ 12 employees
[seed] ✅ 15 suppliers
[seed] ✅ 100 products (+ stock + supplier prices)
[seed] ✅ 20 recipes
[seed] ✅ 8 menus
[seed] ✅ menu items
...
[seed] 🎉 הזריעה הושלמה בהצלחה.
```

---

## קני מידה

| Scale  | אחוז | שימוש          |
|--------|------|----------------|
| small  | 10%  | פיתוח מקומי   |
| medium | 50%  | staging        |
| large  | 100% | demo מלא, הדגמה |

הגדרות מדויקות: `src/scales/small.ts`, `medium.ts`, `large.ts`.

## ה-tenant — קייטרינג טעימים

| מאפיין      | ערך              |
|-------------|------------------|
| Slug        | `demo`           |
| Hebrew Name | קייטרינג טעימים |
| VAT Rate    | 18%              |
| Currency    | ILS              |
| Timezone    | Asia/Jerusalem   |
| Locale      | he-IL            |
| Kosher      | בד״ץ העדה החרדית |

### 12 משתמשים אמיתיים

| תפקיד          | שם              | אימייל                       |
|----------------|-----------------|------------------------------|
| מנכ״ל          | יוסי לוי        | yossi.levi@taimim.co.il      |
| מנהלת תפעול    | שרה כהן         | sara.cohen@taimim.co.il      |
| שף ראשי        | משה אברהם       | moshe.avraham@taimim.co.il   |
| שף משנה        | דוד מזרחי       | david.mizrahi@taimim.co.il   |
| סו שף          | יעקב פרץ        | yaakov.peretz@taimim.co.il   |
| מנהלת מכירות   | רחל גולדברג     | rachel.goldberg@taimim.co.il |
| סוכנת מכירות   | אסתר פרידמן     | ester.friedman@taimim.co.il  |
| סוכנת מכירות   | מרים אזולאי     | miriam.azulay@taimim.co.il   |
| סוכן מכירות    | אבי ביטון       | avi.biton@taimim.co.il       |
| נהג ראשי       | יצחק דהן        | itzik.dahan@taimim.co.il     |
| נהג            | שלמה אדרי       | shlomi.edri@taimim.co.il     |
| מנהלת מלצרים   | לאה שטרן        | lea.stern@taimim.co.il       |

ססמה לכולם: `demo-pass-2026` (bcrypt hashed).

---

## מבנה הנתונים

### Setup

- **tenant** — יחיד, "קייטרינג טעימים"
- **roles** — owner / manager / chef / sales / driver / waiter / accountant
- **users** — 12, מקושרים ל-roles ול-employees
- **employees** — 1:1 עם users, כולל ת.ז., חשבון בנק, ברירת חופשה ושכר חודשי

### CRM

- **customers** — 50 לקוחות מעורבים:
  - B2B הייטק: Wix, monday, Check Point, Playtika, Lightricks, Fiverr, Salesforce
  - B2B מלונות: Dan, Hilton, Leonardo, ישרוטל
  - חינוך: מכללת הרצוג, אונ׳ ת״א, האוני׳ העברית, גנים, תיכונים
  - B2C: 15 משפחות לאירועי חתונה/ברית/בר ובת מצווה/אירוסין/יום הולדת
  - מוסדות: כללית, מכבי, מאוחדת, לאומית, איכילוב, צה״ל, משטרה, עמותות (יד שרה, לתת), עיריות
- **contacts** — איש קשר עיקרי + לעיתים משני לכל לקוח B2B
- **addresses** — כתובות לחיוב ולמשלוח בערים אמיתיות
- **leads** — 30 לידים עם UTM tracking, פיפליין מלא
- **tags / segments** — VIP, חוזרים, חתונות, ברית מילה, B2B-הייטק, ממשלתי וכו'

### תפריטים ומתכונים

- **menus** — 8 תפריטים:
  1. תפריט חתונה בשרי - VIP (₪380/אורח)
  2. תפריט בר מצווה בשרי (₪280)
  3. תפריט ברית מילה חלבי (₪145)
  4. תפריט יום הולדת פרווה (₪165)
  5. תפריט צמחוני מלא (₪155)
  6. תפריט ילדים (₪75)
  7. תפריט טעימות VIP (₪580)
  8. ארוחת בוקר לכנס (₪95)
- **menu-items** — 80 פריטי מנה (עברית, מחיר, אלרגנים, FK ל-recipes/products)
- **recipes** — 20 מתכונים מלאים (קבב, שניצל, סלמון, חומוס, קוסקוס, שקשוקה, רוגלך, ...) עם steps + ingredients
- **products** — 100 חומרי גלם: בשר/עוף/דגים/ירקות/פירות/יין/חלב/יבש/חד״פ/תבלינים/אגוזים/קפה. עם SKU, יחידה, עלות, מחיר, חיי מדף

### ספקים ורכש

- **suppliers** — 15 ספקים אמיתיים: משק חי, שוק כרמל, יין מילגם, ירדן, תנובה, תרה, ברמן, אנג'ל, שופרסל פרו, דגי הכרמל, נטו, עוף טוב, זוגלובק, כתר, יופי ילדים
- **supplier-prices** — מחיר ספק עם תוקף ו-lead time

### אירועים והזמנות

- **events** — 30 אירועים בפיזור:
  - **15 בעבר** — `COMPLETED` + invoice + payment מלא
  - **10 בהווה** — `IN_PROGRESS` / `CONFIRMED` עם תשלום חלקי 50%
  - **5 בעתיד** — `CONFIRMED` / `DRAFT` עם מקדמה 25%
- **order-items** — שורות מנות לכל אירוע
- **invoices** — חשבוניות עם מספרי הקצאה (2026-XXXXXX), מע״מ 18%
- **receipts** — קבלות (R-2026-XXXXXX)
- **payments** — תשלומים עם references אמיתיים: Cardcom, iCount, Bit, צ׳ק, מזומן

### HR ותפעול

- **shifts** — 200 משמרות בכל הסטטוסים (scheduled/confirmed/completed/missed)
- **time-entries** — לכל משמרת שהושלמה
- **payroll** — 3 חודשי תלושי שכר לכל עובד (כולל ביטוח לאומי + מס הכנסה מדורג)
- **vehicles** — 4 רכבים (Mercedes Sprinter, VW Crafter, Iveco Daily, Renault Kangoo) עם תוקפי ביטוח/רישוי/טיפול
- **deliveries** — 30 משלוחים מקושרים לאירועים, רכבים ונהגים

### כספים

- **expenses** — ~120 הוצאות (אוכל, חד״פ, יין, דלק, חשמל, שכ״ד, פרסום)
- **budget-categories (CoA)** — תרשים חשבונות ישראלי היררכי (הכנסות / עלות המכר / תפעוליות / שכר / שיווק)

### שיווק

- **campaigns** — 5: עצמאות 2026, פסח 2026, תשרי 2026, חתונות קיץ, בר מצוות אביב
- **testimonials** — 10 המלצות בעברית עם דירוג
- **gallery** — 30 פריטי תמונה לקטגוריות שונות

---

## איפוס

מחיקת כל הנתונים של tenant=demo (סדר מחיקה בטוח לפי FK):

```bash
tsx src/reset.ts --tenant=demo
# או
npm run reset
```

מחזיר את הטננט והכל תחתיו ל-state ריק. אפשר להריץ seed שוב אחר כך.

---

## בדיקות

```bash
npm test
# או
npm run test:watch
```

### תכולת הבדיקות

`tests/data-integrity.test.ts` — שלמות נתונים סטטית (ללא DB):

- כל ה-FKs מוצבעים נכון (productKey → PRODUCTS, recipeKey → RECIPES, menuKey → MENUS)
- מחירים > 0, רווח גולמי הגיוני (unitPrice ≥ unitCost)
- SKUs ייחודיים, keys ייחודיים, אימיילי משתמשים ייחודיים
- חישובי VAT/withVat עקביים
- ת.ז. ישראלית — 9 ספרות + ספרת ביקורת ולידית
- ח.פ. — מתחיל ב-5, 9 ספרות
- קמפיינים — `endsAt > startsAt`, תקציב > 0
- CoA — אין מעגלים, אין כפילויות

`tests/dates.test.ts` — אין `Invalid Date`, אזור זמן ישראל.

`tests/rng.test.ts` — דטרמיניזם של ה-RNG עם seed קבוע.

---

## ארכיטקטורה

```
packages/seed-data/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
│
├── prisma/
│   └── seed.ts                  # נקודת כניסה — master orchestrator
│
├── src/
│   ├── index.ts                 # re-exports
│   ├── context.ts               # SeedContext + Scale
│   ├── reset.ts                 # מחיקה מלאה לפי tenant
│   │
│   ├── utils/
│   │   ├── ids.ts               # UUID דטרמיניסטי (did())
│   │   ├── rng.ts               # Mulberry32 RNG עם seed
│   │   ├── dates.ts             # עוזרי תאריכים, Asia/Jerusalem
│   │   ├── money.ts             # VAT 18%, invoiceNumber, receipts
│   │   └── hebrew.ts            # ערים/רחובות/שמות/ת.ז./ח.פ./בנקים
│   │
│   ├── setup/
│   │   ├── tenant.ts            # קייטרינג טעימים
│   │   ├── roles.ts             # 7 roles + permissions
│   │   └── users.ts             # 12 משתמשים אמיתיים
│   │
│   ├── data/
│   │   ├── customers.ts         # 50 לקוחות
│   │   ├── contacts.ts          # אנשי קשר
│   │   ├── addresses.ts         # כתובות
│   │   ├── leads.ts             # 30 לידים + UTM
│   │   ├── menus.ts             # 8 תפריטים
│   │   ├── menu-items.ts        # 80 פריטי מנה
│   │   ├── recipes.ts           # 20 מתכונים
│   │   ├── products.ts          # 100 מוצרים + stock + supplier prices
│   │   ├── suppliers.ts         # 15 ספקים
│   │   ├── events.ts            # 30 אירועים (15 עבר / 10 הווה / 5 עתיד)
│   │   ├── orders.ts            # OrderItems
│   │   ├── invoices.ts          # חשבוניות מקצי
│   │   ├── payments.ts          # תשלומים + קבלות
│   │   ├── employees.ts         # עובדים + יתרת חופשה
│   │   ├── shifts.ts            # 200 משמרות + time entries
│   │   ├── payroll.ts           # תלושי שכר
│   │   ├── vehicles.ts          # 4 רכבים
│   │   ├── deliveries.ts        # 30 משלוחים
│   │   ├── expenses.ts          # הוצאות
│   │   ├── budgets.ts           # alias ל-CoA
│   │   ├── coa.ts               # תרשים חשבונות
│   │   ├── campaigns.ts         # 5 קמפיינים
│   │   ├── segments.ts          # 8 tags
│   │   ├── testimonials.ts      # 10 המלצות
│   │   └── gallery.ts           # 30 פריטים
│   │
│   └── scales/
│       ├── index.ts             # CONFIGS map
│       ├── small.ts             # 10%
│       ├── medium.ts            # 50%
│       └── large.ts             # 100%
│
└── tests/
    ├── data-integrity.test.ts
    ├── dates.test.ts
    └── rng.test.ts
```

### עקרונות

1. **דטרמיניזם** — אותו seed = אותו פלט בכל הרצה. שימושי לבדיקות ולרפרודקציה.
2. **UUIDs יציבים** — `did(key)` מחשב UUID מ-key קריא. רצים שוב? מקבלים את אותם IDs.
3. **Upsert בכל מקום** — אפשר להריץ seed שוב בלי לקרוס. `id` + `update: {...}` או `update: {}`.
4. **FKs יציבים** — קישורים בין קבצים דרך keys סמנטיים (`product:demo:salmon`).
5. **קנה מידה דרך factor** — כל data file מקבל `ctx.factor` ומקצץ את ה-baseline שלו.
6. **עברית כברירת מחדל** — שמות, תיאורים, ערים, פרטי תפריט, הערות — הכל בעברית.

---

ביוצרי טכנולוגיה — **Sync Up**.
