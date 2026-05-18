# @aneh-hashoel/icount

חבילת אינטגרציה מלאה ל-iCount עבור הפלטפורמה "ענה את השואל" ופרויקטים נוספים.

> תוכנה מאושרת על ידי רשות המסים בישראל - מספר אישור **1346**.
> תמיכה מלאה במודל ישראל לחשבוניות מס דיגיטליות עם מספרי הקצאה.

## תכונות עיקריות

- לקוח REST טיפוסי מלא (TypeScript) עם Authentication דרך `ICOUNT_API_KEY` + `COMPANY_ID`
- שיטות API: `createInvoice`, `createReceipt`, `createQuote`, `getAllocationNumber`, `getVATReport`, `listTransactions`, `cancelDocument`
- תמיכה במספרי הקצאה (Allocation Numbers) - חובה החל מ-2024 לחשבונית מס מעל הסף
- דוחות מע"מ כולל פורמט PCN874 (מבנה אחיד) הנדרש על ידי רשות המסים
- מקלט Webhooks עם אימות חתימת HMAC-SHA256 והגנה מפני replay attacks
- סנכרון אוטומטי של לקוחות וספקים
- ארכיטקטורת Adapter Pattern: iCount, GreenInvoice (חשבונית ירוקה), Rivhit (ריווחית)
- תורי משימות BullMQ עם Retry אקספוננציאלי
- מודל IntegrationLogs לתיעוד מלא לצרכי ביקורת וציות
- בדיקות יחידה מקיפות עם Mock-ים (nock)
- ציות מלא לדרישות רשות המסים בישראל

## התקנה

```bash
npm install @aneh-hashoel/icount
```

## הגדרה

הגדרת משתני סביבה:

```bash
ICOUNT_API_KEY=your_api_key_here
ICOUNT_COMPANY_ID=your_company_id
ICOUNT_WEBHOOK_SECRET=webhook_signing_secret
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

## שימוש בסיסי

### יצירת חשבונית מס

```ts
import { AdapterFactory, ProviderName, DocumentType, VATType } from '@aneh-hashoel/icount';

const adapter = AdapterFactory.create(ProviderName.ICOUNT, {
  apiKey: process.env.ICOUNT_API_KEY!,
  companyId: process.env.ICOUNT_COMPANY_ID!,
});

const invoice = await adapter.createInvoice({
  type: DocumentType.TAX_INVOICE,
  currency: 'ILS',
  language: 'he',
  sendByEmail: true,
  customer: {
    name: 'חברת ABC בע"מ',
    taxId: '123456789',
    email: 'office@abc.co.il',
  },
  items: [
    {
      description: 'שירותי ייעוץ הלכתי',
      quantity: 10,
      unitPrice: 500,
      vatType: VATType.STANDARD,
      vatRate: 17,
    },
  ],
});

console.log('מספר חשבונית:', invoice.documentNumber);
console.log('מספר הקצאה:', invoice.allocationNumber);
console.log('סכום כולל:', invoice.totalAmount);
```

### הנפקת מספר הקצאה ידנית

```ts
const allocation = await adapter.getAllocationNumber({
  documentType: DocumentType.TAX_INVOICE,
  totalAmount: 35100,
  vatAmount: 5100,
  customerTaxId: '123456789',
  issueDate: '2024-06-15',
});

console.log(allocation.allocationNumber);
```

> מספר הקצאה נדרש החל מ-2024 לחשבוניות מס שערכן הכולל עולה על 25,000 ש"ח.
> הסף יורד הדרגתית בכל שנה (2025: 20k, 2026: 10k, 2027: 5k).
> הספרייה בודקת אוטומטית האם נדרש מספר הקצאה ומנפיקה אותו.

### הפקת דוח מע"מ

```ts
const report = await adapter.getVATReport({
  fromDate: '2024-06-01',
  toDate: '2024-06-30',
  reportType: 'monthly',
  format: 'pcn874',
});

console.log('סה"כ מכירות:', report.totalSales);
console.log('סה"כ מע"מ:', report.totalVAT);
console.log('פורמט PCN874:', report.pcn874Format);
```

### רשימת תנועות

```ts
const transactions = await adapter.listTransactions({
  fromDate: '2024-06-01',
  toDate: '2024-06-30',
  documentType: DocumentType.TAX_INVOICE,
  page: 1,
  pageSize: 50,
});

console.log(`סה"כ ${transactions.total} מסמכים, עמוד ${transactions.page}`);
```

### Webhook Receiver

```ts
import express from 'express';
import { WebhookReceiver, WebhookEventType } from '@aneh-hashoel/icount';

const app = express();
const receiver = new WebhookReceiver({
  secret: process.env.ICOUNT_WEBHOOK_SECRET!,
});

receiver.on(WebhookEventType.INVOICE_CREATED, async (payload) => {
  console.log('חשבונית חדשה נוצרה:', payload.data);
});

receiver.on(WebhookEventType.PAYMENT_RECEIVED, async (payload) => {
  console.log('תשלום התקבל:', payload.data);
});

app.post('/webhooks/icount',
  express.raw({ type: 'application/json' }),
  receiver.expressMiddleware()
);

app.listen(3000);
```

### תור משימות BullMQ

```ts
import { IntegrationQueue } from '@aneh-hashoel/icount';

const queue = new IntegrationQueue({
  name: 'icount-jobs',
  connection: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  },
  defaultJobOptions: {
    attempts: 5,
    backoffDelay: 5000,
  },
});

// הוספה לתור
await queue.enqueue({
  type: 'create-invoice',
  data: { /* invoice payload */ },
});

// רישום worker
queue.registerWorker('create-invoice', async (job) => {
  const invoice = await adapter.createInvoice(job.data as any);
  return invoice;
}, 5);
```

### IntegrationLogs - לוגים לציות

```ts
import {
  IntegrationLogger,
  InMemoryLogStore,
  OperationType,
} from '@aneh-hashoel/icount';

const store = new InMemoryLogStore(); // יש להחליף ב-Postgres/Mongo בייצור
const logger = new IntegrationLogger(store);

await logger.audit(OperationType.CREATE_INVOICE, 'icount', {
  success: true,
  documentNumber: 'INV-001',
  allocationNumber: 'A-9999',
  amount: 35100,
});
```

### החלפה דינמית בין ספקים

```ts
import { AdapterFactory, ProviderName } from '@aneh-hashoel/icount';

// לחברות שעובדות עם GreenInvoice
const greenAdapter = AdapterFactory.create(ProviderName.GREEN_INVOICE, config);

// או Rivhit
const rivhitAdapter = AdapterFactory.create(ProviderName.RIVHIT, config);

// אותו interface בדיוק - אפשר להחליף בלי לשנות את הקוד הקורא
const invoice = await greenAdapter.createInvoice(input);
```

## ציות לרשות המסים

הספרייה תוכננה במלואה לפי דרישות רשות המסים בישראל:

- אישור תוכנה מספר 1346
- תמיכה מלאה במספרי הקצאה (Israel Tax Allocation Numbers)
- פורמט PCN874 (מבנה אחיד) לדיווח מקוון
- תיעוד מלא של פעולות לצרכי ביקורת
- אבטחת אימות בקשות API
- שמירה על פרטיות נתוני לקוחות

## פיתוח

```bash
npm install
npm run build
npm test
```

## רישיון

MIT
