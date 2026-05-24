# @integrations/cardcom

חבילת אינטגרציה ל-CardCom: ממשק TS מלא ל-LowProfile, Tokenization (zero-PCI),
Recurring (הוראת קבע), Bit + Google Pay + Apple Pay, Chargeback, Split payments,
ו-Milestones (מקדמה -> ביניים -> סופי). כולל Admin UI ב-RTL/עברית, BullMQ retry,
ו-IntegrationLogs.

## התקנה

```bash
npm install @integrations/cardcom
```

## הגדרות ENV

ראה `.env.example`. החובה:
- `CARDCOM_TERMINAL`
- `CARDCOM_USERNAME`
- `CARDCOM_API_NAME`

## שימוש מהיר

```ts
import { CardComClient } from '@integrations/cardcom';

const client = new CardComClient({
  terminal: Number(process.env.CARDCOM_TERMINAL),
  username: process.env.CARDCOM_USERNAME!,
  apiName: process.env.CARDCOM_API_NAME!,
});

// LowProfile iframe (zero-PCI)
const lp = await client.createLowProfile({
  amount: 199.9,
  numOfPayments: 3, // 1-12
  successUrl: 'https://app/success',
  failedUrl: 'https://app/fail',
  webhookUrl: 'https://app/webhooks/cardcom',
  productName: 'מנוי חודשי',
});

// טעינה ב-iframe לפי lp.url
```

## Flows

- חיוב בודד / 1-12 תשלומים / קרדיט
- Tokenization (zero-PCI)
- הוראת קבע (Recurring)
- Bit, Google Pay, Apple Pay
- Chargeback (webhook -> DB + alert)
- Split payments
- Milestones: מקדמה -> ביניים -> סופי
- עריכת כל פרמטר בפרופיל

## Admin UI

ראה `admin-ui/` — דשבורד RTL/עברית ל-IntegrationLogs, retries, חיפוש עסקאות.
