# schema-migration

כלי ETL בעברית להעברת נתונים מהסכמות המודולריות הישנות (pre-2026, פר־מודול) אל
הסכמה המאוחדת החדשה שב־`packages/db/prisma/schema.prisma`.

המסמך המנחה למיפוי שדות הוא
[`packages/db/MIGRATION-FROM-MODULES.md`](../../packages/db/MIGRATION-FROM-MODULES.md).
כל transformer פה ממפה ישירות לפי הטבלאות שם.

---

## למה הכלי הזה?

לפני האיחוד, כל מודול (CRM, Orders, Finance Docs, HR, Fleet, Expenses) חי
ב־schema נפרד עם:

- מפתחות `cuid` שונים בכל DB.
- סכומים כ־`Float` ולא `Decimal` (איבוד דיוק).
- שיעורי מע"מ כשבר עשרוני (`0.17` ולא `17`).
- סמך "רשמי / לא רשמי" כ־boolean בשם שונה לכל מודול.
- אין `tenantId` מאוחד.

הסכמה החדשה דורשת:

- `UUID` בכל מקום.
- `Decimal(12,2)` לכל סכום כסף.
- `vatRate = 18` (אחוז) כברירת מחדל.
- `category: FinancialCategory` (`OFFICIAL`/`UNOFFICIAL`).
- `tenantId` חובה בכל רשומה.

הכלי הזה מבצע את כל הנירמולים הללו, idempotent (אפשר להריץ כמה פעמים),
ועם יכולת `rollback` מלאה לפי `batch_id`.

---

## מבנה הספרייה

```
tools/schema-migration/
├── bin/
│   ├── migrate.ts       — CLI ראשי
│   ├── rollback.ts      — ביטול ריצה לפי batch_id
│   ├── validate.ts      — count + integrity checks
│   └── diff.ts          — HTML report לפני/אחרי
├── src/
│   ├── engine.ts        — מרכזי: extract → transform → load
│   ├── types.ts         — Types
│   ├── extractors/      — 8 מחלצים (CRM, Orders, Finance, HR, Fleet, Expenses, Leads, Payments)
│   ├── transformers/    — מיפוי שדות + נירמול
│   ├── loaders/         — INSERT/UPSERT + conflict resolution
│   ├── dedup/           — זיהוי לקוחות כפולים
│   ├── validate/        — count match + FK integrity
│   ├── diff/            — דו"ח HTML עברית
│   └── util/            — logger, normalize, reporter, prisma client
└── tests/               — 10 קבצי vitest
```

---

## התקנה

```bash
cd tools/schema-migration
npm install
```

הכלי תלוי ב־`@prisma/client` של הפרויקט הראשי (הסכמה המאוחדת). ודא ש־
`prisma generate` הורץ עבור `packages/db` לפני שמריצים מיגרציה אמיתית.

---

## הגדרת משתני סביבה

```bash
# DB יעד — Postgres עם הסכמה החדשה
export TARGET_DATABASE_URL="postgres://user:pass@host:5432/unified"

# DB מקורות — ספק לפי הצורך, רק מה שרלוונטי לריצה
export SOURCE_CRM_DATABASE_URL="postgres://.../crm_old"
export SOURCE_ORDERS_DATABASE_URL="postgres://.../orders_old"
export SOURCE_FINANCE_DOCS_DATABASE_URL="postgres://.../finance_old"
export SOURCE_HR_DATABASE_URL="postgres://.../hr_old"
export SOURCE_FLEET_DATABASE_URL="postgres://.../fleet_old"
export SOURCE_EXPENSES_DATABASE_URL="postgres://.../expenses_old"
```

---

## הרצה — Dry Run (בלי לכתוב כלום)

לפני שמריצים על production, חובה לבדוק:

```bash
npm run migrate -- \
  --source=crm \
  --target-tenant=$TENANT_UUID \
  --dry-run \
  --limit=100 \
  --verbose
```

הריצה תחלץ את 100 הלקוחות הראשונים, תפעיל transform, ותדפיס אזהרות (`type`/`status`
לא ידועים, סכומים לא תואמים וכו'), אבל לא תכתוב ל־DB.

---

## הרצה אמיתית — סדר מומלץ

מסדר זה מינימליסטי וחשוב — כי יש תלויות זרות בין הטבלאות:

1. **לקוחות (CRM)** — חייב להיות ראשון, כי חשבוניות והזמנות מצביעות עליהם.
   ```bash
   npm run migrate -- --source=crm --target-tenant=$TENANT --batch-id=migration_2026Q2_step1
   ```
2. **עובדים (HR)** — מסתמכים על דייר בלבד.
   ```bash
   npm run migrate -- --source=hr --target-tenant=$TENANT --batch-id=migration_2026Q2_step2
   ```
3. **רכבים (Fleet)** — תלויים בעובדים (`driverId`).
   ```bash
   npm run migrate -- --source=fleet --target-tenant=$TENANT --batch-id=migration_2026Q2_step3
   ```
4. **הזמנות → אירועים (Orders)** — מצביעות על לקוחות.
   ```bash
   npm run migrate -- --source=orders --target-tenant=$TENANT --batch-id=migration_2026Q2_step4
   ```
5. **חשבוניות (Finance Docs)** — מצביעות על לקוחות.
   ```bash
   npm run migrate -- --source=finance-docs --target-tenant=$TENANT --batch-id=migration_2026Q2_step5
   ```
6. **הוצאות (Expenses)** — מצביעות על ספקים/בנקים.
   ```bash
   npm run migrate -- --source=expenses --target-tenant=$TENANT --batch-id=migration_2026Q2_step6
   ```

או הרצה אחת מסיבית:

```bash
npm run migrate -- --source=all --target-tenant=$TENANT --continue-on-error
```

---

## אפשרויות CLI עיקריות

| דגל | משמעות |
|------|---------|
| `--source <mod>` | מודול מקור: `crm`, `orders`, `finance-docs`, `hr`, `fleet`, `expenses`, `all` |
| `--target-tenant <uuid>` | **חובה** — מזהה דייר יעד |
| `--dry-run` | לא כותב כלום ל־DB |
| `--limit <n>` | מגביל מספר שורות לכל extractor |
| `--continue-on-error` | ממשיך גם אם שורה נכשלת (אחרת — עוצר) |
| `--batch-id <id>` | מזהה batch לרולבק. אם לא סופק — נוצר אוטומטית |
| `--report <path>` | מיקום `report.json` (ברירת מחדל: `reports/migration.json`) |
| `-v, --verbose` | פלט debug |

---

## דו"חות ואימות

לאחר ריצה, רצים שני שלבי אימות:

### 1. אימות אוטומטי

```bash
npm run validate -- --out=reports/validation.json
```

מבצע:

- **Count match** — `SELECT COUNT(*)` במקור מול היעד, פר טבלה.
- **Integrity** — בודק שכל FK חוקי (אין חשבוניות ללא לקוח, אין תשלומים ללא חשבונית).
- **Sanity** — `subtotal + tax = total`, `paidAmount <= totalAmount`.

הקובץ מכיל `countMatches[]` ו־`integrityIssues[]`. אם יש שגיאות — exit code 1.

### 2. דו"ח HTML בעברית

```bash
# שמור snapshot לפני
psql $TARGET -c "SELECT json_object_agg(table_name, n_live_tup) ..." > reports/before.json
# הרץ מיגרציה
npm run migrate -- ...
# שמור snapshot אחרי
psql $TARGET -c "..." > reports/after.json
# בנה דו"ח
npm run diff -- \
  --before reports/before.json \
  --after reports/after.json \
  --validation reports/validation.json \
  --report reports/migration.json \
  --out reports/diff.html
```

הדו"ח הוא RTL, עם טבלאות "לפני / אחרי / הפרש", רשימת בעיות integrity ושגיאות.

---

## Rollback

אם משהו השתבש — אפשר לבטל ריצה שלמה לפי `batch_id`:

```bash
# קודם בדוק מה ימחק (dry-run)
npm run rollback -- --batch-id=migration_2026Q2_step5 --dry-run

# בצע מחיקה אמיתית
npm run rollback -- --batch-id=migration_2026Q2_step5
```

הרולבק מסתמך על העמודה `_migration_batch_id` שכל loader מוסיף לכל רשומה.
**לכן חשוב** — הסכמה החדשה צריכה לכלול את העמודה הזו על כל הטבלאות שעוברות
מיגרציה. הסקריפט `prisma/migrations/_add_migration_columns.sql` (שירות נפרד)
מוסיף את העמודה.

ניתן להגביל לטבלאות ספציפיות:

```bash
npm run rollback -- --batch-id=... --tables=invoices,payments
```

> ⚠️ `audit_logs` היא append-only עם טריגרים שמונעים DELETE. רולבק שלה
> צריך אישור DBA ידני (טריגרים זמני לא־פעיל).

---

## Dedup לקוחות

זיהוי אוטומטי של לקוחות שנמצאים בשני DB־ים שונים (CRM ישן + Orders ישן) ועלולים
להיווצר פעמיים בסכמה החדשה:

```typescript
import { dedupCustomers } from "@tools/schema-migration/src/dedup";
const groups = dedupCustomers(transformedCustomers);
// groups[0] = { canonicalId, duplicateIds[], reason, confidence: 'high'|'medium' }
```

אלגוריתם:

1. `taxId` זהה → התאמה חזקה.
2. `email` זהה → התאמה חזקה.
3. `phone` זהה (אחרי normalize) → התאמה חזקה.
4. שם דומה (Levenshtein ≤ 2) באותו `tenantId` → התאמה בינונית.

ה־`canonicalId` הוא הרשומה עם הכי הרבה שדות מלאים. הכלי כיום מדווח בלבד —
החלטת המיזוג נעשית ידנית (כדי למנוע איבוד נתונים).

---

## בעיות נפוצות (Troubleshooting)

### "FK violation על customer_id"

הזמנת/חשבונית מצביעה על לקוח שלא קיים בסכמה החדשה. סיבות:

- לקוח נמחק במקור (cascade לא הופעל).
- ה־CRM extractor רץ אחרי ה־Invoices extractor (סדר שגוי).

**פתרון**: הרץ קודם `--source=crm`, ואחר כך `--source=finance-docs`.

### "VAT לא תואם"

הטרנספורמר מזהיר על `subtotal + tax != total`. לרוב מקור הבעיה הוא נתוני הסכמה
הישנה — `Float` שאיבד דיוק במעלה הדרך. ה־warning הוא informational; הרשומה תיטען
עם הסכומים המקוריים.

### "Duplicate key (tenant_id, invoice_num)"

הסכמה החדשה דורשת `invoiceNum` ייחודי פר־דייר. אם המקור הישן הכיל כפילויות
(חשבוניות ישנות שאיש לא תיקן) — הריצה נכשלת. פתרונות:

- הוסף suffix ידני בנתוני המקור לפני המיגרציה.
- השתמש ב־`--continue-on-error` כדי לדלג עליהן (הן יופיעו ב־`report.json` ב־`errors[]`).

### "audit_logs append-only error"

כל ניסיון UPDATE/DELETE ל־`audit_logs` נדחה על־ידי טריגר ב־DB. זה תקין. רק
INSERT־ים עוברים. רולבק שלהן מצריך השבתת הטריגר זמנית (`ALTER TABLE audit_logs
DISABLE TRIGGER ALL;`) — צעד שדורש אישור DBA.

### "Decimal precision loss"

אם משכורת מוצגת `15000.001` (במקום `15000.00`) — בדוק שה־transformer קורא
ל־`floatToDecimal` ולא ממיר `parseFloat`. כל ההמרות חייבות לעבור דרך `Decimal.js`.

---

## בדיקות

```bash
npm test                  # ריצה אחת
npm run test:watch        # מצב watch
npm run typecheck         # tsc --noEmit
```

10 קבצי בדיקה מכוונים על:

- `normalize.test.ts` — normalize utilities (UUID, Decimal, מע"מ, טלפון, ת.ז.).
- `transformCustomer.test.ts` — מיפוי לקוחות.
- `transformInvoice.test.ts` — vatRate, OFFICIAL/UNOFFICIAL, סכום אינווריאנט.
- `transformOrder.test.ts` — Order → Event, EventType mapping.
- `transformEmployee.test.ts` — ת.ז., משכורת, status.
- `transformExpense.test.ts` — מקור, סטטוס, supplierId.
- `transformPayment.test.ts` — method mapping (WIRE→BANK_TRANSFER וכו').
- `dedupCustomers.test.ts` — taxId/email/phone/fuzzy name.
- `reporter.test.ts` — צבירת סטטיסטיקה, ניקוי URLs מ־report.
- `htmlReport.test.ts` — דו"ח HTML RTL.
- `engineRouting.test.ts` — ניתוב routeTransform.

---

## נקודות לתשומת לב

1. **idempotency** — כל ה־transformers משתמשים ב־`deterministicUuid(sourceModule, originalId)`,
   כך שריצה חוזרת תייצר UUIDים זהים → upsert ידע למזג, לא להכפיל.
2. **אין מחיקה בשגגה** — `loaders` רק `INSERT`/`UPDATE`, אף פעם לא `DELETE`.
   מחיקה היא רק דרך `rollback.ts` מפורש.
3. **ברירת מחדל OFFICIAL** — כל ישות פיננסית (Invoice, Payment, Expense)
   נקבעת ל־`OFFICIAL` אלא אם המקור הישן סימן אחרת.
4. **שינוי `vatRate`** — הסכמה החדשה מאחסנת אחוזים (`18`), לא שברים (`0.18`).
   אם המקור היה `0.17` (לפני העלאת המע"מ ל־18%) — הוא יומר ל־`17`. **לא** ל־18.
5. **timezone** — כל ה־`DateTime` נשמרים כ־UTC. ה־UI אחראי להמרה ל־
   `Asia/Jerusalem`.

---

## רישיון ובעלות

חלק מהמונורפו הראשי. מיועד לשימוש פנימי בלבד.
