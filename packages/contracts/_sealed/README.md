# `@catering/contracts`

חבילת **חוזים** (Types + Zod Schemas + Domain Events + API Contracts) מאוחדת לפלטפורמת הקייטרינג.

זוהי החבילה היחידה שמותר ל-frontend, backend וכלי-ה-ETL לייבא ממנה — כך שמודל הנתונים נשאר אחיד ועקבי בין כל השירותים.

## עקרונות

- **שפת תיאור אחת**: TypeScript + Zod. כל סכמה גם משמשת לוולידציה בזמן-ריצה וגם מפיקה טיפוסים סטטיים.
- **ID-ים ב-`cuid`**: מזהים מבוזרים, יציבים, ניתנים לסידור (`c...`) — כל ישות עם branded id (כגון `CustomerId`).
- **כסף ב-Decimal**: שדה `Money` מיוצג כמחרוזת Decimal (`decimal.js`) — **לעולם לא `number`**. עוזר למנוע שגיאות עיגול במע"מ ובסכומים מצטברים.
- **מע"מ ישראל 18%**: `VAT_RATE = 0.18`. עוזרים: `vatAmount`, `withVat`.
- **מטבע ברירת מחדל ILS** (תומך גם USD/EUR).
- **שדות רגישים** (ת"ז, חשבון בנק, שכר) מסומנים כ-`EncryptedField` — לא נחשפים כטקסט גלוי ב-API.
- **Domain Events** במעטפת אחידה (`eventId`, `name`, `version`, `occurredAt`, `payload`) ו-`discriminatedUnion` ראשי לכל האירועים.
- **`tsconfig` strict** מלא: `noUncheckedIndexedAccess`, `noImplicitReturns`, `noUnusedLocals` ועוד.

## מבנה התיקיות

```
src/
  common/      — Money, IDs, Address, Contact, Tag, Timestamps, EncryptedField
  enums/       — Role, OrderStatus, PaymentStatus, DocType, DeliveryStatus, FinancialCategory, Currency
  entities/    — Customer, Order, Invoice, Event, Employee, Product, Recipe, Supplier,
                 Vehicle, Lead, Payment, Delivery
  events/      — אירועי דומיין (lead.created, order.placed, payment.received, ...)
  api/         — חוזי קריאה ל-tRPC (createOrder, payOrder, scheduleEvent, ...)
tests/         — בדיקות Vitest
```

## ישויות עיקריות

### `Customer`
- סוגים: `B2B` / `B2C` / `INSTITUTION` (בית-ספר, ישיבה, צה"ל, מוסד וכד').
- כולל: `contacts[]`, `addresses[]`, `tags[]`, `taxId` (ח"פ/ת"ז), `creditTermsDays`.

### `Order`
- סוגים: `ONE_TIME_EVENT` / `SUBSCRIPTION` / `MONTHLY_PLAN`.
- `OrderStatus` עם מכונת-מצבים (`ORDER_TRANSITIONS`).
- מינוי / תכנית חודשית — חייבים `recurrence` (cadence + rrule אופציונלי).
- ולידציה: לא ניתן להעביר `recurrence` ב-`ONE_TIME_EVENT`.

### `Invoice`
- `DocType`: `QUOTE` / `INVOICE` / `TAX_INVOICE` / `RECEIPT` / `TAX_INVOICE_RECEIPT` / `CREDIT_NOTE` / `PROFORMA` / `DELIVERY_NOTE`.
- `DocTag`: `OFFICIAL` / `UNOFFICIAL` — הפרדה חיונית בין מסלולי הדיווח.
- מע"מ 18% ברירת מחדל. `vatAmount`, `vatRate`, `subtotal`, `grandTotal`, `amountPaid`, `amountDue`.
- `CREDIT_NOTE` חייב הפנייה ל-`relatedInvoiceId`.

### `Event`
- חתונה / בר-מצווה / ברית / כנס / חג / יום-יום מוסדי.
- `staffing[]` — שיבוץ עובדים לתפקידים ולחלונות זמן.

### `Employee`
- ת.ז., חשבון בנק, שכר בסיס — **מסומנים כ-`EncryptedField`**.
- סוגי העסקה: `FULL_TIME`, `PART_TIME`, `HOURLY`, `CONTRACTOR`, `SEASONAL`.

### `Product` + `Recipe`
- מוצרים: `INGREDIENT` / `DISH` / `PACKAGE` / `BEVERAGE` / `EQUIPMENT` / `SERVICE`.
- אלרגנים + כשרות.
- מתכון מקשר מוצרים עם כמויות וצעדי הכנה.

### `Supplier`, `Vehicle`, `Lead`, `Payment`, `Delivery`
- כל אחד עם הסכמה שלו וטיפוס מיוצא.

## Domain Events

מכל אירוע ניתן לייבא `Schema` ו-`Type`. כולם עטופים ב-`DomainEventEnvelope`:

```ts
{
  eventId: Cuid,
  name: 'order.placed',
  version: 1,
  occurredAt: '2026-05-11T...',
  actorId?: Cuid,
  correlationId?: Cuid,
  causationId?: Cuid,
  payload: { ... }
}
```

אירועים זמינים:
- `lead.created`
- `quote.sent`, `quote.accepted`
- `order.placed`, `order.approved`, `order.cancelled`
- `payment.received`, `payment.failed`
- `invoice.issued`, `invoice.paid`
- `event.scheduled`, `event.completed`
- `delivery.dispatched`, `delivery.completed`
- `inventory.low`, `inventory.received`
- `employee.clocked`, `payroll.calculated`

`DomainEventSchema` — `discriminatedUnion('name', ...)` לכל האירועים.

## API Contracts (tRPC-ready)

לכל פעולה: `<Name>InputSchema` + `<Name>OutputSchema` (במקרים שיש פלט).

דוגמאות:
- `CreateOrderInput` / `CreateOrderOutput`
- `PayOrderInput` / `PayOrderOutput`
- `ApproveOrderInput`, `CancelOrderInput`, `RefundOrderInput`
- `ScheduleEventInput`, `AssignStaffInput`, `CompleteEventInput`
- `CreateCustomerInput`, `UpdateCustomerInput`, `ListCustomersInput`
- `IssueInvoiceInput`, `VoidInvoiceInput`

## שימוש

```ts
import {
  CustomerSchema,
  OrderSchema,
  money,
  vatAmount,
  withVat,
  DomainEventSchema,
  CreateOrderInputSchema,
} from '@catering/contracts';

// יצירת סכום בשקלים
const price = money('100'); // ILS
const withTax = withVat(price); // 118 ILS

// וולידציה של קלט API
const parsed = CreateOrderInputSchema.parse(req.body);

// פירוש אירוע מ-event bus
const event = DomainEventSchema.parse(JSON.parse(message));
switch (event.name) {
  case 'order.placed': /* ... */ break;
  case 'payment.received': /* ... */ break;
}
```

## פיתוח

```bash
pnpm install
pnpm --filter @catering/contracts build
pnpm --filter @catering/contracts test
pnpm --filter @catering/contracts typecheck
```

## כללי תרומה

- כל שינוי בסכמת ישות = bump ב-`version` של האירועים הנוגעים בדבר.
- אסור להחזיר ערכי כסף כ-`number` — תמיד `Money` (string Decimal + currency).
- שדה רגיש (כל מה שמכיל PII) חייב לעבור דרך `EncryptedField`.
- כל ישות עם `Timestamps` (`createdAt`, `updatedAt`, `deletedAt?`).
