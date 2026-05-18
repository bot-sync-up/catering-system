# @syncup/icount-production

חבילת אינטגרציה production-grade ל-iCount, עם תמיכה מלאה במודל ישראל
ובתוכנה מאושרת מס' **1346** מטעם רשות המסים בישראל.

## תכונות עיקריות

- **IcountClient** — לקוח HTTP מלא ל-API של iCount (axios + auth ב-`cid + api_token`)
- **AllocationManager** — ניהול מספרי הקצאה לפי ספי מודל ישראל (25K / 20K / 10K / 5K ₪)
- **תוכנה מאושרת 1346** — הצהרה, headers, hash, ו-footer לחשבוניות
- **דוחות לרשות המסים** — PCN874 (Mai101), טופס 126, טופס 856
- **Webhooks** — מקלט עם אימות חתימה (Cloud-Auth + replay protection)
- **שרשרת fallback** — iCount → GreenInvoice → Rivhit → Mock
- **Queue + Retry** — BullMQ עם exponential backoff (5 attempts)
- **ארכוב 7 שנים** — Cloudflare R2 / S3 עם Object Lock (COMPLIANCE mode)
- **Integration Log** — תיעוד מלא של כל קריאת API

## התקנה

```bash
pnpm add @syncup/icount-production
```

## שימוש בסיסי

### יצירת חשבונית מס

```ts
import { IcountClient, AllocationManager, DocumentType } from '@syncup/icount-production';

const client = new IcountClient({
  credentials: { cid: 'YOUR_CID', user: 'u', password: 'p', apiToken: 'TOKEN' },
});

const allocation = new AllocationManager({ client });

// קבלת מספר הקצאה אם נדרש (לפי שנה+סכום)
const allocNum = await allocation.assertAllocationIfNeeded(30000, 2025, {
  doctype: DocumentType.TAX_INVOICE,
  date: '2025-06-01',
  customer_name: 'לקוח א',
  customer_vat_id: '123456789',
});

// יצירת חשבונית
const invoice = await client.createTaxInvoice({
  client_name: 'לקוח א',
  vat_id: '123456789',
  items: [{ description: 'שירות', quantity: 1, unitprice: 30000 }],
  allocation_num: allocNum ?? undefined,
});

console.log('מספר חשבונית:', invoice.doc_num);
```

### שימוש ב-AdapterFactory עם fallback

```ts
import { AdapterFactory, IcountClient } from '@syncup/icount-production';

const factory = new AdapterFactory({
  icount: { client: new IcountClient({ credentials }) },
  greeninvoice: { apiKey: 'X', apiSecret: 'Y' },
  rivhit: { apiToken: 'Z' },
  enableMockFallback: true,
});

const { result, provider } = await factory.execute(a =>
  a.createTaxInvoice({ client_name: 'לקוח', items: [...] }),
);
console.log(`חשבונית נוצרה דרך: ${provider}`);
```

### Queue + Retry

```ts
import { createIcountQueue, createIcountWorker, InMemoryLogStore, createLogSink } from '@syncup/icount-production';

const store = new InMemoryLogStore();
const queue = createIcountQueue({
  connection: { host: 'localhost', port: 6379 },
  factory,
  logSink: createLogSink(store),
});

await queue.add('invoice', {
  type: 'createTaxInvoice',
  payload: { client_name: 'לקוח ב', items: [{ description: 'X', quantity: 1, unitprice: 1000 }] },
  referenceId: 'order-12345',
});

createIcountWorker({ connection: { host: 'localhost', port: 6379 }, factory, logSink: createLogSink(store) });
```

### דוח PCN874

```ts
import { PCN874Generator } from '@syncup/icount-production';

const gen = new PCN874Generator();
const xml = gen.generateXml({ year: 2025, month: 6, records: [...] });
const txt = gen.generateText({ year: 2025, month: 6, records: [...] });
```

### Webhooks

```ts
import { WebhookReceiver } from '@syncup/icount-production';

const receiver = new WebhookReceiver({ secret: process.env.ICOUNT_WEBHOOK_SECRET! });

receiver.on('invoice.paid', async (event) => {
  console.log('חשבונית שולמה:', event.data);
});

// Express
app.post('/webhooks/icount', receiver.middleware());
```

### ארכוב ל-7 שנים

```ts
import { Archiver } from '@syncup/icount-production';

const archiver = new Archiver({
  endpoint: 'https://your-account.r2.cloudflarestorage.com',
  accessKeyId: '...', secretAccessKey: '...', bucket: 'icount-archive',
});

await archiver.archiveDocument({
  cid: 'C1', docId: invoice.doc_num!, docType: 'tax_invoice', year: 2025,
  body: pdfBuffer, contentType: 'application/pdf',
});
```

## מבנה החבילה

```
src/
├── IcountClient.ts          # HTTP client
├── AdapterFactory.ts        # fallback chain
├── healthCheck.ts           # health monitoring
├── queue.ts                 # BullMQ
├── archival.ts              # R2/S3 7-year retention
├── IntegrationLog.ts        # audit log
├── types.ts                 # zod schemas
├── allocation/
│   └── AllocationManager.ts # מודל ישראל
├── compliance/
│   └── software1346.ts      # הצהרת תוכנה מאושרת
├── reports/
│   ├── pcn874Generator.ts   # Mai101
│   ├── form126.ts           # 126 שנתי
│   └── form856.ts           # 856 שנתי
├── webhooks/
│   └── receiver.ts
└── adapters/
    ├── IBillingAdapter.ts
    ├── IcountAdapter.ts
    ├── GreenInvoiceAdapter.ts
    ├── RivhitAdapter.ts
    └── MockAdapter.ts
```

## בדיקות

```bash
pnpm test
```

מכיל מבחנים ל-allocation thresholds, PCN874, ו-fallback chain.

## הצהרת תאימות

ראה [`docs/1346-compliance.md`](./docs/1346-compliance.md) לתיעוד מלא של דרישות
התאימות הישראליות והוראות יישום.

## רישיון

MIT
