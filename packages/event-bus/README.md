# `@catering/event-bus`

Event Bus type-safe לפלטפורמת הקייטרינג, מבוסס BullMQ + Redis Streams.

## תכונות

- **Type-safe לחלוטין** — כל אירוע מוגדר ב-`DomainEventMap` עם payload חזק.
- **שני מודי פעולה** — BullMQ (queue, עם retries ו-DLQ) או Redis Streams (history).
- **Saga Coordinator** — orchestration של distributed transactions עם compensation אוטומטי.
- **Metadata אחיד** — id, timestamp, source, correlationId, causationId, schemaVersion.
- **Logging** — pino, ניתן להחלפה.

## התקנה

```bash
pnpm add @catering/event-bus
```

## שימוש בסיסי

```ts
import { EventBus } from '@catering/event-bus';

const bus = new EventBus({
  redisUrl: 'redis://localhost:6379',
  source: 'crm-service',
});

// פרסום אירוע
await bus.publish('lead.created', {
  leadId: 'lead-123',
  customerName: 'דני כהן',
  phone: '050-1234567',
  source: 'website',
});

// רישום handler
bus.subscribe('lead.created', async (event) => {
  console.log('lead חדש:', event.payload.customerName);
});

await bus.start();
```

## אירועים נתמכים

מערכת האירועים מכסה את כל ה-domains של הפלטפורמה:

| Domain    | אירועים                                             |
| --------- | --------------------------------------------------- |
| Lead      | `lead.created`, `lead.qualified`                    |
| Quote     | `quote.sent`, `quote.accepted`                      |
| Order     | `order.placed`, `order.approved`, `order.cancelled` |
| Portal    | `portal.submitted`                                  |
| Payment   | `payment.received`, `payment.failed`, `payment.captured` |
| Invoice   | `invoice.issued`, `invoice.paid`, `invoice.due`     |
| Event     | `event.scheduled`, `event.completed`, `event.ready` |
| Delivery  | `delivery.dispatched`, `delivery.completed`         |
| Inventory | `inventory.low`, `inventory.received`               |
| HR        | `employee.clocked`, `payroll.calculated`, `month.closed` |

## מודי פעולה

### Queue (BullMQ) - ברירת מחדל

```ts
await bus.publish('order.placed', payload); // הולך לתור BullMQ
```

- מבטיח processing יחיד
- Retries אוטומטיים עם exponential backoff
- DLQ עבור jobs שכשלו אחרי כל הניסיונות

### Stream (Redis Streams)

```ts
await bus.publish('inventory.low', payload, { mode: 'stream' });
```

- שמירת history של אירועים
- Consumer Groups - מאפשר fan-out לכמה consumers
- Replay של אירועים היסטוריים

## Saga Pattern

```ts
import { buildCancelEventSaga } from '@catering/event-bus/saga';

const saga = buildCancelEventSaga(services);
const result = await saga.run({
  eventId: 'ev-1',
  orderId: 'ord-1',
  customerId: 'cust-1',
  reason: 'הלקוח ביטל',
  cancelledBy: 'admin-1',
});

if (result.status === 'compensated') {
  console.error('הביטול הופנה אחורה:', result.error);
}
```

### Saga של ביטול אירוע (8 שלבים)

1. וידוא הרשאות
2. ביטול ההזמנה
3. ביטול משימות מטבח
4. הסרת שיבוץ האירוע
5. ביטול משלוח
6. החזרת inventory
7. שחרור עובדים
8. הוצאת זיכוי

כל שלב כולל `compensate` אוטומטי שמתבצע בסדר הפוך במקרה של כשל.

## בדיקות

```bash
pnpm test
```

הבדיקות משתמשות במוקים ל-BullMQ ול-ioredis — אין צורך ב-Redis מקומי.

## רישיון

UNLICENSED — שימוש פנימי בלבד.
