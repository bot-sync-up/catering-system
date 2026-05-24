# @catering/event-bus

Wrapper type-safe סביב **BullMQ** + **Redis** (כולל Redis Streams) עבור מערכת הקייטרינג.
מספק:

- `EventBus` — class יחיד לפרסום ועיבוד events.
- `Domain events` מוגדרים ב-`types.ts` עם type safety מלאה.
- `SagaCoordinator` — orchestration של saga עם compensation אוטומטית.
- `cancelEventSaga` — סאגה לדוגמה: ביטול אירוע קייטרינג ב-8 שלבים.

## התקנה

```bash
pnpm add @catering/event-bus
```

> דורש Redis 6+ זמין.

## שימוש בסיסי

```ts
import { EventBus } from '@catering/event-bus';

const bus = new EventBus({ host: '127.0.0.1', port: 6379 });

// רישום handler לפני start
bus.subscribe('order.placed', async (event) => {
  console.log('הזמנה חדשה:', event.payload.orderId);
});

await bus.start();

// פרסום
await bus.publish('order.placed', {
  orderId: 'ORD-123',
  customerId: 'CUST-1',
  totalAmount: 1500,
  currency: 'ILS',
  items: [{ sku: 'PIZZA-L', quantity: 5, unitPrice: 60 }],
});
```

## רשימת events נתמכים

| Event                  | תיאור                                    |
|------------------------|------------------------------------------|
| `lead.created`         | ליד חדש נכנס מה-CRM                      |
| `quote.sent`           | הצעת מחיר נשלחה ללקוח                    |
| `quote.accepted`       | לקוח אישר הצעת מחיר                      |
| `order.placed`         | הזמנה נפתחה                              |
| `order.approved`       | הזמנה אושרה                              |
| `order.cancelled`      | הזמנה בוטלה                              |
| `payment.received`     | תשלום התקבל                              |
| `payment.failed`       | תשלום נכשל                               |
| `invoice.issued`       | חשבונית הופקה                            |
| `invoice.paid`         | חשבונית שולמה                            |
| `event.scheduled`      | אירוע (יום-עבודה) תוזמן                  |
| `event.completed`      | אירוע הסתיים                             |
| `delivery.dispatched`  | משלוח יצא לדרך                           |
| `delivery.completed`   | משלוח נמסר                               |
| `inventory.low`        | מלאי ירד מתחת לסף                        |
| `inventory.received`   | מלאי התקבל                               |
| `employee.clocked`     | עובד החתים כניסה/יציאה                   |
| `payroll.calculated`   | חישוב משכורת הושלם                       |

## Redis Streams

ל-fan-out רב צרכנים, אפשר להפעיל Redis Streams במקום queue רגיל:

```ts
const bus = new EventBus({ useStreams: true, host: '127.0.0.1' });
```

## Saga — דוגמה

```ts
import { SagaCoordinator, buildCancelEventSaga } from '@catering/event-bus';

const coord = new SagaCoordinator();
const saga = buildCancelEventSaga(
  { orderId: 'O-1', eventId: 'E-1', customerId: 'C-1', reason: 'lockdown', refundAmount: 1500 },
  deps // injected services
);
const result = await coord.run(saga);
if (!result.success) {
  console.error('saga failed at', result.failedStep, 'compensated:', result.compensated);
}
```

8 השלבים: `validateCancellation` → `cancelOrder` → `cancelKitchenPrep` → `cancelDelivery` →
`releaseInventory` → `issueRefund` → `issueCreditNote` → `notifyCustomer`.
לכל שלב יש `compensate` הפוך שמוחזר אוטומטית בכשל.

## בדיקות

```bash
pnpm test
```

הבדיקות רצות ב-`inMemory: true` ולכן לא דורשות Redis.
