# @syncup/cardcom-production

SDK ברמת פרודקשן לסליקה מול **Cardcom** — כולל 3DS, Webhooks, Sandbox, BullMQ ו-Idempotency.

> **חשוב — Zero-PCI:** החבילה הזו **לעולם לא** מקבלת PAN+CVV. נתוני כרטיס נאספים אך ורק בעמודי האירוח של Cardcom (LowProfile iframe) ומומרים ל-Token. כל פעולה נוספת משתמשת ב-Token בלבד.

---

## תוכן עניינים

1. [התקנה](#התקנה)
2. [שימוש בסיסי](#שימוש-בסיסי)
3. [LowProfile (iframe)](#lowprofile-iframe)
4. [חיוב לפי Token](#חיוב-לפי-token)
5. [3DS — Payer Authentication](#3ds--payer-authentication)
6. [Webhooks](#webhooks)
7. [BullMQ — תור חיובים אסינכרוני](#bullmq--תור-חיובים-אסינכרוני)
8. [Sandbox / Mock Server](#sandbox--mock-server)
9. [שגיאות וניסיונות חוזרים](#שגיאות-וניסיונות-חוזרים)
10. [Idempotency](#idempotency)
11. [טסטים](#טסטים)

---

## התקנה

```bash
npm install @syncup/cardcom-production
```

תלויות: `axios`, `bullmq`, `ioredis`, `express`, `zod`.

---

## שימוש בסיסי

```ts
import { CardcomClient } from '@syncup/cardcom-production';

const client = new CardcomClient({
  credentials: {
    terminalNumber: process.env.CARDCOM_TERMINAL!,
    apiName: process.env.CARDCOM_API_NAME!,
    apiPassword: process.env.CARDCOM_API_PASSWORD,
  },
  environment: 'production', // או 'sandbox'
});
```

---

## LowProfile (iframe)

יצירת מושב iframe לתשלום מאובטח. התוצאות מתקבלות דרך ה-iframe עם קודים: `0` = הצלחה, `9XX` = כשל.

```ts
const session = await client.createLowProfile({
  amount: 49.9,
  currency: 'ILS',
  successUrl: 'https://app.example.co.il/payment/ok',
  failedUrl:  'https://app.example.co.il/payment/fail',
  webHookUrl: 'https://api.example.co.il/webhooks/cardcom',
  productName: 'מנוי חודשי',
  operation:   'ChargeAndCreateToken',
  language:    'he',
});

// session.Url → מציגים ב-iframe ללקוח
// אחרי שהלקוח חזר:
const result = await client.getLowProfileResult(session.LowProfileId);
if (result.ResponseCode === 0) {
  const token = result.TranzactionInfo?.Token; // ← נשמור את ה-Token בלבד
}
```

---

## חיוב לפי Token

```ts
const charge = await client.charge({
  amount: 19.9,
  currency: 'ILS',
  token: 'tok_xxxxxxxx',
  productName: 'חיוב חודשי',
  numOfPayments: 1,
  idempotencyKey: 'order-12345', // מומלץ — תמיד.
});
```

החיוב מוגן ב-idempotency כך שניתן לקרוא לו שוב ושוב עם אותו `idempotencyKey` ולקבל את אותו תוצאה (קריאת רשת אחת בלבד).

החזר כספי:

```ts
await client.refund({ tranzactionId: charge.TranzactionId, partialSum: 5 });
```

החלפת Token (rotation — **רק Token, לא PAN/CVV!**):

```ts
const fresh = await client.tokenize({
  token: 'tok_old',
  cardExpiry: { month: 12, year: 2030 },
});
```

ניסיון להעביר `cardNumber`/`cvv` ייכשל מיידית ויעלה שגיאת אבטחה.

חיובים חוזרים (Recurring):

```ts
const rec = await client.createRecurring({
  token: 'tok_xxxxxxxx',
  amount: 49.9,
  currency: 'ILS',
  productName: 'מנוי שנתי',
  interval: 'MONTHLY',
  startAt: new Date('2026-06-01'),
  totalPayments: 12,
});

await client.cancelRecurring({ recurringId: rec.RecurringId, reason: 'user-cancel' });
```

---

## 3DS — Payer Authentication

```ts
const auth = await client.authorize3ds({
  amount: 100,
  currency: 'ILS',
  token: 'tok_xxxx',
  returnUrl: 'https://app.example.co.il/3ds/return',
  productName: 'הזמנה',
});

if (auth.ChallengeRequired) {
  // הפנו את הלקוח ל-auth.RedirectUrl. אחרי שה-ACS מחזיר PARes/CRes:
  const final = await client.complete3ds({
    threeDsSessionId: auth.ThreeDsSessionId!,
    paRes: 'PARES_FROM_ACS',
  });
  // final.AuthorizationData → צרפו ל-charge
} else {
  // frictionless — auth.AuthorizationData זמין כבר עכשיו
}
```

קודי 901/902/903 גוררים ניסיון אוטומטי אחד נוסף (לפי הנחיות Cardcom).

---

## Webhooks

אימות חתימה HMAC-SHA256, בדיקת חלון replay של 5 דקות ו-nonce store (Redis).

```ts
import express from 'express';
import {
  CardcomWebhookHandler,
  RedisNonceStore,
} from '@syncup/cardcom-production';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);
const handler = new CardcomWebhookHandler({
  signingSecret: process.env.CARDCOM_WEBHOOK_SECRET!,
  nonceStore: new RedisNonceStore(redis),
  replayWindowSec: 300, // ברירת מחדל
});

const app = express();

// חובה: לקרוא raw body, לא JSON parsed — אחרת החתימה תיכשל.
app.post(
  '/webhooks/cardcom',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const event = await handler.verifyAndParse({
        rawBody: req.body.toString('utf8'),
        signature: req.header('X-Cardcom-Signature')!,
        timestamp: req.header('X-Cardcom-Timestamp')!,
        nonce:     req.header('X-Cardcom-Nonce')!,
        eventType: req.header('X-Cardcom-Event')!,
      });

      switch (event.type) {
        case 'payment.captured':   /* ... */ break;
        case 'payment.failed':     /* ... */ break;
        case 'refund.completed':   /* ... */ break;
        case 'chargeback.opened':  /* ... */ break;
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  },
);
```

אירועים קנוניים שמופצים מטה:
- `payment.captured`
- `payment.failed`
- `refund.completed`
- `chargeback.opened`
- `recurring.charged` / `recurring.failed`
- `token.created` / `token.revoked`

---

## BullMQ — תור חיובים אסינכרוני

```ts
import IORedis from 'ioredis';
import {
  createChargeQueue,
  createChargeWorker,
  enqueueCharge,
} from '@syncup/cardcom-production';

const connection = { host: 'redis', port: 6379 };

// בצד הוובסרבר:
const queue = createChargeQueue(connection);
await enqueueCharge(queue, {
  jobId: 'order-12345',
  charge: {
    amount: 49.9,
    currency: 'ILS',
    token: 'tok_xxxxxxxx',
    productName: 'מנוי',
    idempotencyKey: 'order-12345',
  },
});

// בצד ה-Worker:
const { worker, dlq, shutdown } = createChargeWorker({
  connection,
  client,
  integrationLog: myIntegrationLogStore, // טבלת DB משלך
});
```

מאפיינים:
- Idempotency אוטומטי לפי `jobId`.
- Retry אקספוננציאלי על שגיאות חולפות בלבד.
- DLQ ייעודי (`cardcom:dlq`) לכשלים סופיים.
- כל ניסיון נכתב ל-`IntegrationLog` (pending → success / failed / dlq).

---

## Sandbox / Mock Server

לפיתוח לוקאלי ו-CI ללא חיבור ל-Cardcom:

```bash
npm run sandbox
# ↳ Express ב-http://localhost:4242
```

או בקוד:

```ts
import { CardcomClient, createMockApp } from '@syncup/cardcom-production';

const app = createMockApp({ port: 4242 });
app.listen(4242);

const client = new CardcomClient({
  credentials: { terminalNumber: '1000', apiName: 'mock' },
  environment: 'sandbox',
  baseUrlOverride: 'http://localhost:4242',
});
```

**Tokens קסומים** לתרחישי שגיאה:

| Token              | תרחיש                                    |
|--------------------|------------------------------------------|
| `token_decline`    | סירוב (ResponseCode 7)                   |
| `token_timeout`    | תקלה חולפת (ResponseCode 902, HTTP 503)  |
| `token_3ds`        | ChallengeRequired=true                   |
| `token_chargeback` | מייצר אירוע chargeback מאוחר יותר        |
| כל ערך אחר         | אישור (ResponseCode 0)                   |

---

## שגיאות וניסיונות חוזרים

```ts
import { CardcomError, isRetryable } from '@syncup/cardcom-production';

try {
  await client.charge({...});
} catch (e) {
  if (e instanceof CardcomError && e.retryable) {
    // ניסוי נוסף יתבצע אוטומטית — אבל אם הגעת לכאן הניסיונות מוצו
  }
}
```

**ResponseCodes שמסומנים כניתנים-לניסיון-חוזר:** `901`, `902`, `903`
**HTTP statuses:** `408`, `425`, `429`, `500`, `502`, `503`, `504`
**Network codes:** `ECONNRESET`, `ETIMEDOUT`, `ECONNABORTED`, `EAI_AGAIN`

ה-backoff: אקספוננציאלי `baseDelay * 2^attempt` עם **full jitter** עד `maxDelay`.

---

## Idempotency

`charge` תמיד עוטף את הקריאה ב-`runIdempotent`. אם לא העברת `idempotencyKey`, ייוצר אוטומטית — אבל למשתמשי SDK רציניים מומלץ להעביר מפתח יציב (למשל ID של הזמנה) כדי לאפשר ניסיונות חוזרים בטוחים אחרי קריסות.

```ts
await client.charge({
  ...,
  idempotencyKey: `order:${orderId}:attempt:${attemptNumber}`,
});
```

ברירת המחדל היא חנות-זיכרון מקומית — בפרודקשן יש להזריק מימוש Redis (סקירה תאומה ל-`RedisNonceStore`).

---

## טסטים

```bash
npm test
```

קבצי טסט:
- `tests/client.test.ts` — LowProfile/Charge/Refund/Tokenize/Recurring + retry.
- `tests/webhook.test.ts` — HMAC, replay window, nonce, normalization.
- `tests/3ds.test.ts` — frictionless / challenge / retry 902 / failure.
- `tests/idempotency.test.ts` — store primitives + integration עם CardcomClient.

הטסטים משתמשים ב-`vitest` + `nock` (אין רשת אמיתית).

---

## רישיון

UNLICENSED — שימוש פנימי בלבד.
