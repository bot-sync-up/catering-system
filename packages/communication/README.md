# @syncup/communication

חבילת שליחה אחודה לכל ערוצי התקשורת — Email, SMS, WhatsApp, Push.
שכבה אחת מעל כל הספקים: ניתוב, fallback, retry, consent, שעות שקט, מגבלות שימוש ובקרת עלויות.

## למה צריך את זה

בכל מערכת B2B נכתב בסוף את אותו קוד עוגן שוב ושוב: client ל-SendGrid, client ל-019, client ל-WhatsApp, ספריית בקרת רטריי, בדיקת consent לפני שליחה, שעות שקט, ניהול עלויות, queue של BullMQ. החבילה הזו מאחדת את כל זה ב-API אחד.

```ts
import { UnifiedSender, SendGridProvider, Provider019, MetaCloudProvider, ExpoProvider } from '@syncup/communication';

const sender = new UnifiedSender([
  new SendGridProvider({ apiKey: process.env.SG_KEY!, fromEmail: 'no-reply@syncup.co.il' }),
  new Provider019({ username: process.env.SMS_USER!, password: process.env.SMS_PASS!, source: 'SyncUp' }),
  new MetaCloudProvider({ accessToken: process.env.WA_TOKEN!, phoneNumberId: process.env.WA_PHONE_ID! }),
  new ExpoProvider(),
]);

await sender.send({
  channel: 'email',
  to: { address: 'moshe@example.com', tenantId: 't1', userId: 'u1', name: 'משה' },
  template: { id: 'welcome', data: { brandName: 'Sync Up', firstName: 'משה', ctaUrl: 'https://app.syncup.co.il' } },
});
```

## רכיבי-ליבה

| קובץ | תפקיד |
| --- | --- |
| `src/types.ts` | טיפוס `Message` ו-`SendResult` |
| `src/IMessageSender.ts` | האינטרפייס שכל ספק מממש |
| `src/UnifiedSender.ts` | הניתוב, ה-fallback וה-retry |
| `src/consent/check.ts` | בדיקת consent מ-consent ledger לפני שליחה |
| `src/consent/audit.ts` | רישום audit log לכל שליחה (כולל skip) |
| `src/quiet-hours.ts` | שעות שקט (22:00–08:00 ברירת מחדל ל-`Asia/Jerusalem`) |
| `src/rate-limit.ts` | מכסה יומית פר-ערוץ + burst per-minute |
| `src/cost-tracker.ts` | מעקב עלות פר-(טננט, ספק) |
| `src/queue/sender-worker.ts` | BullMQ worker + DLQ |
| `src/queue/scheduled-sender.ts` | שליחה עתידית (delay) |

## ספקים

### Email
- **SendGrid** — קליינט אמיתי ל-Web API v3, כולל dynamic templates עם merge fields, צרופות, click/open tracking, custom args ל-webhook tracking.
- **AWS SES** — fallback זול יותר לוולומים גדולים. תבניות מומרות מקומית ל-HTML לפני השליחה.
- **MockEmailProvider** — לטסטים ולפיתוח.

### SMS
- **Provider019** — שער 019 הישראלי, פרוטוקול XML-over-HTTPS. הספק תומך ב-charset UTF-8 לעברית, ב-customer message id, ב-scheduled delivery וב-status callbacks.
- **TwilioProvider** — fallback בינלאומי, כולל תמיכה ב-Messaging Service SID.
- **MockSmsProvider** — לטסטים.

### WhatsApp
- **MetaCloudProvider** — Meta Cloud API גרסה `v19.0`. תומך ב:
  - **Template messages** — תבניות מאושרות מראש מ-Meta Business Manager (חובה כדי לפתוח שיחה / מחוץ לחלון 24 שעות).
  - **Free-form** — בתוך חלון 24 שעות של שירות לקוחות.
  - **Media** — תמונה / PDF / וידאו / אודיו (העלאה דרך `uploadMedia()` או `link`).
  - **Interactive** — כפתורי תגובה ורשימות.
- **`webhook.ts`** — אימות `hub.verify_token` + אימות חתימת `X-Hub-Signature-256`, dispatch ל-handlers של הודעות נכנסות ו-status.

### Push
- **ExpoProvider** — Expo Push API לאפליקציות שרצות על Expo (Driver Center, ועוד).
- **FcmProvider** — Firebase Cloud Messaging דרך firebase-admin.
- **ApnsProvider** — Apple Push דרך node-apn (token auth, לא .p12).
- **`preferences.ts`** — DND windows, channel/category preferences, opt-out.

## תבניות

### Email (`src/email/templates/`)
תבניות עברית RTL, MJML + Handlebars:
- `welcome` — קבלת פנים
- `orderConfirmation` — אישור הזמנה
- `paymentReceipt` — קבלה על תשלום
- `eventReminder` — תזכורת לאירוע
- `birthdayWish` — איחול יום הולדת + קוד הטבה
- `npsRequest` — סקר NPS (0–10)
- `monthInvoice` — חשבונית חודשית
- `deliveryEta` — משלוח בדרך + מעקב חי

### SMS (`src/sms/templates/`)
- `otp` — קוד אימות (1 segment)
- `orderShipped` — הזמנה נשלחה
- `paymentReminder` — תזכורת תשלום
- `eventToday` — תזכורת אירוע
- `driverEta` — שליח בדרך
- `appointmentReminder` — תזכורת תור

### WhatsApp (`src/whatsapp/templates/`)
- `order_confirmation` — אישור הזמנה
- `payment_reminder` — תזכורת תשלום
- `event_day_reminder` — תזכורת ביום האירוע
- `otp_login` — קוד כניסה

**כל תבנית WhatsApp חייבת להיות מאושרת מראש ב-Meta Business Manager עם אותו `name` ו-`languageCode`.**

## Consent + Compliance

לפני כל שליחה (פרט להודעות מערכת/OTP עם `bypassConsent: true`):

1. `checkConsent(recipient, channel)` — שולף מ-consent-ledger ובודק אם ה-status האחרון הוא `granted`.
2. `isWithinQuietHours(recipient)` — מבוטל לרמת `critical`.
3. `checkRateLimit(tenantId, channel)` — מכסה יומית + burst per-minute.

כל שליחה (כולל skip) נכתבת ל-`AuditSink` עם כתובת מוצנעת + digest של הגוף — לעולם לא הגוף עצמו.

הסרה אוטומטית (unsubscribe):

```ts
import { UnsubscribeTokenService, createUnsubscribeHandler } from '@syncup/communication';

const svc = new UnsubscribeTokenService(process.env.UNSUB_SECRET!);
const url = svc.buildUrl('https://syncup.co.il', { userId: 'u1', tenantId: 't1', channel: 'email' });
// app.get('/unsubscribe', createUnsubscribeHandler(svc, async (p) => ledger.record({ ...p, status: 'revoked', source: 'unsubscribe', capturedAt: new Date().toISOString() })));
```

## Queue + Retry

```ts
import { SenderQueue, SenderWorker } from '@syncup/communication';

const queue = new SenderQueue({ connection: { host: 'localhost', port: 6379 } });
new SenderWorker(queue, sender, { connection: { host: 'localhost', port: 6379 }, concurrency: 50 });

await queue.enqueue(message); // exponential backoff, DLQ אחרי 5 ניסיונות
```

עיכוב לעתיד:

```ts
import { ScheduledSender } from '@syncup/communication';
const scheduler = new ScheduledSender(queue);
await scheduler.scheduleIn(message, 60); // עוד שעה
```

## בדיקות

```bash
npm test
```

טסטים מכוסים: SendGrid (nock), Twilio (nock), WhatsApp (nock), consent flow, quiet-hours.

## תיעוד נוסף
- [INTEGRATION-KEYS.md](./INTEGRATION-KEYS.md) — איך להשיג כל מפתח
- [TEMPLATES-CATALOG.md](./TEMPLATES-CATALOG.md) — קטלוג מלא של תבניות
