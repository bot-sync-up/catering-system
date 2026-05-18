# @aneh-hashoel/reports-bi

מנוע דוחות ו-Business Intelligence עבור פלטפורמת **"ענה את השואל"** — מערכת ERP/CRM
לקייטרינג, אירועים וניהול שו"ת רבני.

הספרייה כותבת queries אמיתיים מול ה-Prisma schema של המערכת (`packages/db`),
ובונה דוחות עברית RTL ב-PDF ו-Excel.

---

## תוכן

- [התקנה](#התקנה)
- [שימוש בסיסי](#שימוש-בסיסי)
- [רכיבים](#רכיבים)
- [תזמון אוטומטי](#תזמון-אוטומטי)
- [הוספת KPI חדש](#הוספת-kpi-חדש)
- [טסטים](#טסטים)
- [Variables סביבה](#variables-סביבה)

---

## התקנה

```bash
pnpm install
pnpm --filter @aneh-hashoel/reports-bi build
```

הפונטים העבריים (Heebo) נדרשים ל-PDF builder — ראו `fonts/README.md`.

---

## שימוש בסיסי

### דוח רווח והפסד (P&L)

```typescript
import { buildPnL, buildPnLExcel } from "@aneh-hashoel/reports-bi";

const buckets = await buildPnL({
  tenantId: "11111111-...",
  period: "month",
  range: { from: new Date("2026-01-01"), to: new Date("2026-12-31") },
});

const xlsx = await buildPnLExcel({ buckets, periodLabel: "2026" });
await writeFile("pnl-2026.xlsx", xlsx);
```

### תזרים מזומנים + תחזית 6 חודשים

```typescript
import { buildCashflow } from "@aneh-hashoel/reports-bi";

const points = await buildCashflow({
  tenantId,
  historicalRange: { from: addMonths(new Date(), -12), to: new Date() },
  forecastMonths: 6,
});
// points: [...12 actual, ...6 forecast]
```

### דוח מע"מ חודשי (18%)

```typescript
import { buildVatReport, buildVatPdf, VAT_RATE_2025 } from "@aneh-hashoel/reports-bi";

const buckets = await buildVatReport({
  tenantId,
  range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
  period: "monthly", // או "bimonthly"
});

const pdf = await buildVatPdf({ buckets, rate: VAT_RATE_2025, periodLabel: "2026-05" });
```

### CLI

```bash
pnpm report:run pnl   --tenant=<uuid> --from=2026-01-01 --to=2026-12-31 --period=month
pnpm report:run vat   --tenant=<uuid> --from=2026-01-01 --to=2026-12-31
pnpm report:run cash  --tenant=<uuid>
pnpm report:run aging --tenant=<uuid>
```

---

## רכיבים

### Aggregations (`src/aggregations/`)

| קובץ | מה הוא מחשב |
|------|--------------|
| `pnl.ts` | Revenue / COGS / Gross Margin / Opex / EBITDA — חודשי/רבעוני/שנתי |
| `cashflow.ts` | תזרים בפועל + חיזוי 6 חודשים (רגרסיה לינארית + עונתיות + pipeline אירועים פתוחים) |
| `vat.ts` | מע"מ 18% חודשי או דו-חודשי, OFFICIAL בלבד |
| `cogs-per-event.ts` | רווחיות לפי אירוע — חומרי גלם (FIFO) + עבודה + תקורה |
| `inventory-valuation.ts` | הערכת מלאי FIFO לסוף שנה |
| `breakdowns.ts` | פילוח הכנסות לפי לקוח / סוכן / סוג אירוע |
| `retention.ts` | Cohort retention — לקוחות חוזרים לפי חודש כניסה |
| `customer-ltv.ts` | Lifetime Value חזוי לכל לקוח |
| `aging.ts` | חובות לקוחות 0-30 / 31-60 / 61-90 / 90+ |

### Forecast (`src/forecast/`)

- `linear-regression.ts` — OLS עם חישוב R² לרמת ביטחון.
- `seasonal.ts` — עונתיות חודשית (קייטרינג: קיץ vs חורף). מקדם לכל חודש = avg(month) / avg(all).

### Reports (`src/reports/`)

- `pdf-builder.ts` — pdfkit + פונט Heebo (עברית RTL). מייצא P&L / VAT / Aging.
- `excel-builder.ts` — ExcelJS עם `views.rightToLeft = true` ופורמט ₪.
- `scheduler.ts` — BullMQ + Redis. cron jobs יומי / שבועי / חודשי. שליחה אוטומטית ב-SendGrid.

### API (`src/api/`)

- `GET /api/bi/dashboard?period=month` → `getDashboard()` — KPI cards (Revenue/Gross/EBITDA/Cash/Open invoices/Top customers/Cashflow series).
- `POST /api/bi/drilldown` → `drillDown()` — שאילתות הצללה לתוך KPI (dimensions: customer/agent/eventType/event; metrics: revenue/cogs/profitability/aging/ltv).

---

## תזמון אוטומטי

```typescript
import { buildQueue, buildWorker, registerCronJobs } from "@aneh-hashoel/reports-bi";

// בתהליך ה-API:
const queue = buildQueue();
await registerCronJobs(queue, tenantId, ["cfo@example.co.il", "owner@example.co.il"]);

// בתהליך worker נפרד:
buildWorker();
```

| Job | תזמון | שעה (Asia/Jerusalem) |
|-----|-------|----------------------|
| `daily-pnl` | יומי | 06:00 |
| `weekly-cashflow` | יום שני | 07:00 |
| `monthly-vat` | ה-1 בכל חודש | 08:00 |
| `monthly-pnl` | ה-1 בכל חודש | 08:30 |

נדרש:

- `REDIS_URL` (ברירת מחדל `redis://localhost:6379`)
- `SENDGRID_API_KEY` ו-`SENDGRID_FROM`

---

## הוספת KPI חדש

1. צרו קובץ חדש ב-`src/aggregations/my-kpi.ts` שמייצא פונקציה
   `buildMyKpi(opts: { tenantId, range }): Promise<MyKpiRow[]>`.
2. הוסיפו את ה-type ל-`src/types.ts`.
3. אם רוצים תצוגה ב-Excel — הוסיפו פונקציה ל-`src/reports/excel-builder.ts`.
4. אם רוצים drill-down ב-dashboard — הוסיפו ל-`src/api/drill-down.ts` בלוגיקת ה-switch.
5. אם רוצים תזמון — הוסיפו kind חדש ל-`ReportJobSchema` וטיפול ב-`runReportJob`.
6. ייצאו את הפונקציה ב-`src/index.ts`.
7. הוסיפו טסט ב-`tests/my-kpi.test.ts` עם mock של Prisma.

הקפידו על:

- שימוש ב-`getPrisma()` ולא ב-`new PrismaClient()` ישירות (לטסטים).
- שימוש ב-`Decimal` ולא ב-`number` לסכומים כספיים.
- סינון `tenantId` בכל query.
- ברירת מחדל: `category: "OFFICIAL"` (אלא אם המשתמש מבקש אחרת).

---

## טסטים

```bash
pnpm --filter @aneh-hashoel/reports-bi test
pnpm --filter @aneh-hashoel/reports-bi test:coverage
```

הטסטים משתמשים ב-`vitest-mock-extended` ל-mock של ה-PrismaClient — אין צורך
ב-DB אמיתי. ה-`setPrisma()` מאפשר הזרקה.

---

## Variables סביבה

| משתנה | שימוש |
|--------|--------|
| `DATABASE_URL` | חיבור ל-Postgres (כמו שאר ה-monorepo) |
| `REDIS_URL` | BullMQ |
| `SENDGRID_API_KEY` | שליחת מיילים |
| `SENDGRID_FROM` | כתובת ה-from |
| `PRISMA_LOG=1` | להפעלת logs של queries |
