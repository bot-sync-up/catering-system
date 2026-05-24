# @catering/adapter-wiring

חיווט מלא של 11 ה-adapters ל-EventBus של פלטפורמת הקייטרינג.

## מבנה

```
src/
├── publishers/         # API publishing per business module
│   ├── crm-publisher.ts
│   ├── orders-publisher.ts
│   ├── portal-publisher.ts
│   ├── finance-publisher.ts
│   ├── cardcom-publisher.ts
│   ├── icount-publisher.ts
│   ├── inventory-publisher.ts
│   ├── kitchen-publisher.ts
│   ├── delivery-publisher.ts
│   ├── hr-publisher.ts
│   ├── events-publisher.ts
│   └── types.ts
├── subscribers/        # wiring שמפעיל adapters
│   ├── subscribe-all.ts     # מאתחל את כל ה-11
│   ├── per-app/             # registration לפי שירות
│   │   ├── crm.ts
│   │   ├── orders.ts
│   │   ├── finance.ts
│   │   ├── portal.ts
│   │   ├── inventory.ts
│   │   └── hr.ts
│   └── index.ts
└── index.ts

scripts/
├── verify-wiring.ts        # מאמת שכל אירוע יש לו pub+sub
├── inject-publishers.ts    # מזריק publish() לקריאות Prisma קיימות
└── wire-on-startup.ts      # מוסיף bootstrapEventWiring ל-app.ts

tests/wiring/
├── fakes.ts
├── order-to-invoice.test.ts
├── payment-to-icount.test.ts
├── cancel-event-saga.test.ts
└── full-flow.test.ts

WIRING-MAP.md   # diagram מלא של כל ה-flows
```

## שימוש בסיסי

```ts
import { EventBus } from '@catering/event-bus';
import {
  subscribeAll,
  CrmPublisher,
  OrdersPublisher,
} from '@catering/adapter-wiring';

const bus = new EventBus({ redisUrl: process.env.REDIS_URL!, source: 'orchestrator' });

// הפעלת כל ה-adapters
const { adapters } = await subscribeAll({
  bus,
  redisUrl: process.env.REDIS_URL!,
  clients: {
    finance,
    crm,
    ordersService,
    invoice,
    ordersLookup,
    kitchen,
    scheduler,
    logistics,
    icount,
    cardcom,
    purchasing,
    payroll,
  },
});

await bus.start();

// פרסום אירוע
const ordersPub = new OrdersPublisher({ bus });
await ordersPub.publishOrderApproved({ orderId: 'ord-1', approvedBy: 'mgr-1' });

// ─── teardown ───
await Promise.all(adapters.map((a) => a.stop()));
await bus.stop();
```

## per-app registration

אם רוצים לרוץ במיקרו-שירותים נפרדים, כל שירות מאחל רק את ה-adapters
הרלוונטיים שלו:

```ts
// apps/crm/src/app.ts
import { registerCrmSubscriptions } from '@catering/adapter-wiring/subscribers';

const handle = await registerCrmSubscriptions({ bus, redisUrl, finance, crm });
```

## scripts

| script | מטרה |
| --- | --- |
| `pnpm verify` | אימות סטטי שכל אירוע מחווט (publisher + subscriber) |
| `pnpm inject --dir <path> --write` | הזרקת קריאות `publish()` לקריאות Prisma קיימות |
| `pnpm tsx scripts/wire-on-startup.ts --service crm --app apps/crm/src/app.ts --write` | הוספת `bootstrapEventWiring()` ל-app.ts |

## מפת חיווט

ראה [WIRING-MAP.md](./WIRING-MAP.md) ל-flow מלא של כל אירוע — מי מפרסם
ומי מאזין + תרשים זרימה ASCII.
