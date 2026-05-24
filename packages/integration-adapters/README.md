# @catering/integration-adapters

11 integration adapters שמחברים בין ה-services של מערכת הקייטרינג דרך
ה-event-bus. כל adapter יורש מ-`BaseAdapter` ומקבל בחינם:

- idempotency check (event_id + action) — מונע double-processing.
- retry עם exponential backoff.
- Dead Letter Queue אחרי `maxAttempts` ניסיונות.
- pino logging מובנה עם context אחיד.

## הרשימה

| # | שם המודול                              | טריגר                | מטרה                                                        |
|---|----------------------------------------|----------------------|-------------------------------------------------------------|
| 1 | `crm-to-finance.adapter`               | `quote.accepted`     | פתיחת לקוח/חשבון ב-Finance                                  |
| 2 | `portal-to-orders.adapter`             | `quote.accepted`     | יצירת הזמנה ב-Orders Service                                |
| 3 | `orders-to-finance.adapter`            | `order.approved`     | הפקת חשבונית ופרסום `invoice.issued`                        |
| 4 | `orders-to-kitchen.adapter`            | `order.approved`     | יצירת משימת הכנה במטבח                                      |
| 5 | `orders-to-events.adapter`             | `order.approved`     | תזמון אירוע ופרסום `event.scheduled`                        |
| 6 | `orders-to-logistics.adapter`          | `order.approved`     | יצירת משלוח/שיבוץ נהג                                       |
| 7 | `finance-to-icount.adapter`            | `invoice.issued`     | פתיחת חשבונית-מס ב-iCount                                   |
| 8 | `finance-to-cardcom.adapter`           | `invoice.issued`     | יצירת קישור-תשלום ב-Cardcom                                 |
| 9 | `cardcom-to-finance.adapter`           | webhook (HTTP)       | תרגום webhook → `payment.received` / `payment.failed`       |
|10 | `inventory-to-purchasing.adapter`      | `inventory.low`      | יצירת Purchase Order                                        |
|11 | `hr-to-payroll.adapter`                | `employee.clocked`   | רישום החתמת שעון ל-Payroll                                  |

## רישום adapter חדש

```ts
import { EventBus } from '@catering/event-bus';
import {
  OrdersToFinanceAdapter,
  InMemoryIdempotencyStore,
  InMemoryDLQ,
} from '@catering/integration-adapters';

const bus = new EventBus({ host: 'localhost' });

// ה-deps ממומשים אצלך — interface בלבד
const finance = {
  createInvoice: async ({ orderId, amount, currency }) => {
    // קריאה אמיתית ל-Finance Service
    return { invoiceId: 'INV-' + orderId };
  },
};

const adapter = new OrdersToFinanceAdapter({
  bus,
  finance,
  getOrderAmount: async (orderId) => ({ amount: 1500, currency: 'ILS' }),
  idempotency: new InMemoryIdempotencyStore(), // בייצור: Redis-backed
  dlq: new InMemoryDLQ(),
  maxAttempts: 5,
});

await adapter.start();
await bus.start();
```

## כתיבת adapter משלך

1. צור class שיורש מ-`BaseAdapter`.
2. ממש `readonly name` עם מזהה ייחודי.
3. ממש `protected register()` ושם רשום `this.on(eventName, actionName, handler)`.
4. הוסף `tests/<name>.test.ts` עם לפחות case של הצלחה, retry ו-DLQ.

```ts
import { BaseAdapter, BaseAdapterOptions } from '@catering/integration-adapters';

export class MyAdapter extends BaseAdapter {
  readonly name = 'my-adapter';
  protected register(): void {
    this.on('order.placed', 'my-action', async (evt) => {
      // טפל באירוע
    });
  }
}
```

ה-action הוא חלק ממפתח ה-idempotency, אז ודא שהוא ייחודי לכל הצמדה
event×adapter.

## iCount / Cardcom

ל-iCount ול-Cardcom יש בקובץ `MockICountClient`/`MockCardcomClient` מימוש
mock עבור בדיקות. החיבור האמיתי ל-API מתבצע מחוץ למודול הזה (ב-bootstrap
של ה-deployment).

## בדיקות

```bash
pnpm -F @catering/integration-adapters test
```
