# `@catering/integration-adapters`

Adapters בין מודולי הפלטפורמה - כל adapter מאזין לאירוע מסוג מסוים ומבצע פעולה במערכת אחרת.

## ארכיטקטורה

כל adapter יורש מ-`BaseAdapter`, שמספק:

- **Idempotency** - מבוסס Redis. אירוע עם אותו `metadata.id` לא יעובד פעמיים.
- **Retry** - exponential backoff, ניתן להגדיר `maxRetries` ו-`backoffMs`.
- **DLQ** - אירועים שכשלו אחרי כל הניסיונות עוברים לרשימת `adapter:dlq:<name>`.
- **Logging** - pino עם הקשר אוטומטי (שם ה-adapter, eventId, attempt).
- **Lifecycle** - `start()` / `stop()` להפעלה ועצירה מסודרת.

## רשימת ה-adapters

| Adapter | מאזין ל | פעולה |
| --- | --- | --- |
| `CrmToFinanceAdapter` | `lead.qualified` | יוצר Quote ומפרסם `quote.sent` |
| `PortalToOrdersAdapter` | `portal.submitted` | יוצר Order ומפרסם `order.placed` |
| `OrdersToFinanceAdapter` | `order.approved` | מוציא Invoice ומפרסם `invoice.issued` |
| `OrdersToKitchenAdapter` | `order.approved` | יוצר משימות מטבח (PrepTasks) |
| `OrdersToEventsAdapter` | `order.placed` | משבץ אירוע בלוח האירועים |
| `OrdersToLogisticsAdapter` | `event.ready` | יוצר Delivery ומפרסם `delivery.dispatched` |
| `FinanceToIcountAdapter` | `invoice.issued` | מעתיק חשבונית ל-iCount + allocation |
| `FinanceToCardcomAdapter` | `invoice.due` | יוצר חיוב ב-CardCom |
| `CardcomToFinanceAdapter` | `payment.captured` | מסמן Invoice כשולמה |
| `InventoryToPurchasingAdapter` | `inventory.low` | יוצר Purchase Order |
| `HrToPayrollAdapter` | `month.closed` | מחשב משכורות לכל העובדים הפעילים |

## שימוש

```ts
import { EventBus } from '@catering/event-bus';
import { CrmToFinanceAdapter } from '@catering/integration-adapters';

const bus = new EventBus({
  redisUrl: 'redis://localhost:6379',
  source: 'crm-to-finance',
});

const adapter = new CrmToFinanceAdapter({
  bus,
  redisUrl: 'redis://localhost:6379',
  crm: crmClient,
  finance: financeClient,
});

await adapter.start();
await bus.start();
```

## בניית adapter חדש

```ts
import { BaseAdapter, type AdapterContext } from '@catering/integration-adapters';

export class MyAdapter extends BaseAdapter<'order.placed'> {
  readonly name = 'my-adapter';
  readonly sourceEvent = 'order.placed' as const;

  protected async handle(ctx: AdapterContext<'order.placed'>): Promise<void> {
    // הפעולה שלך כאן
    // אם תזרוק שגיאה - יופעל retry אוטומטי
  }
}
```

## DLQ - שליפת הודעות שכשלו

```ts
import { Redis } from 'ioredis';
const redis = new Redis('redis://localhost:6379');
const failed = await redis.lrange('adapter:dlq:crm-to-finance', 0, -1);
for (const item of failed) {
  const { event, error, failedAt } = JSON.parse(item);
  console.error(`${failedAt} - ${event.name} (${event.metadata.id}): ${error.message}`);
}
```

## בדיקות

```bash
pnpm test
```

יש שלושה קבצי בדיקה:

- `BaseAdapter.test.ts` - בודק idempotency, retry, DLQ
- `CrmToFinanceAdapter.test.ts` - flow קונקרטי של quote
- `OrdersToFinanceAdapter.test.ts` - flow של חשבונית

## רישיון

UNLICENSED — שימוש פנימי בלבד.
