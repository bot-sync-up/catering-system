# הגדרת טלפוניה

מדריך זה מתאר איך לחבר את המערכת לספק טלפוניה — Twilio או מרכזייה ישראלית (IPSALES / IP019).

## אופציה 1 — Twilio (מומלץ לסביבה גמישה)

### יתרונות
- WebSocket Media Streams לזרימת אודיו דו-כיוונית בזמן אמת.
- TTS/STT מובנה אם רוצים pipeline פשוט יותר.
- חיוב לפי שיחה, ללא חוזה.

### חסרונות
- מספרים ישראליים יקרים יחסית.
- צריך חתימה עברית של עוסק לרכישת מספר 0XX.

### שלבים

1. **רכישת מספר**: דרך Twilio Console → Phone Numbers → Buy Number → Israel.
2. **הגדרת Webhook**: בעמוד המספר, A Call Comes In → Webhook → `POST https://your-domain.com/voice/answer`.
3. **משתני סביבה**:
   ```
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_FROM_NUMBER=+972XXXXXXXXX
   PUBLIC_WS_URL=wss://your-domain.com/ws/voice
   ```
4. **הפעלת השרת**:
   ```ts
   import { TwilioVoice, createWebhookServer } from '@syncup/voice-ordering';
   const twilio = new TwilioVoice({
     accountSid: process.env.TWILIO_ACCOUNT_SID!,
     authToken: process.env.TWILIO_AUTH_TOKEN!,
     fromNumber: process.env.TWILIO_FROM_NUMBER!,
     webhookBaseUrl: 'https://your-domain.com',
   });
   const app = createWebhookServer({
     twilio,
     wsStreamUrl: process.env.PUBLIC_WS_URL!,
     onCallStart: async (sid) => console.log('call started', sid),
     onCallEnd: async (sid) => console.log('call ended', sid),
   });
   app.listen({ port: 3000 });
   ```

## אופציה 2 — IPSALES / IP019 (מומלץ למוקדים ישראליים קיימים)

### יתרונות
- מספרים ישראליים זולים, אינטגרציה עם CRM ישראלי.
- העברות פנימיות בין שלוחות.

### חסרונות
- **אין Media Streams** — לא ניתן לקבל אודיו בזמן אמת.
- צריך לעבוד עם REST + webhook לאירועי בקרה בלבד, ו-IVR מוקלט מראש או TTS דרך URL.

### שלבים

1. **רכישת חבילה**: דרך הפורטל של IPSALES (`app.ipsales.co.il`).
2. **קבלת API Key**: בהגדרות החשבון → Module API → New Token.
3. **הגדרת Webhook**: בכל תסריט שיחה → "אירועים חיצוניים" → `POST https://your-domain.com/pbx/ip019/event`.
4. **משתני סביבה**:
   ```
   IP019_BASE_URL=https://app.ipsales.co.il
   IP019_TENANT=your-tenant
   IP019_API_KEY=...
   ```
5. **הפעלה**:
   ```ts
   import { Ip019Pbx, createWebhookServer } from '@syncup/voice-ordering';
   const pbx = new Ip019Pbx({
     baseUrl: process.env.IP019_BASE_URL!,
     tenant: process.env.IP019_TENANT!,
     apiKey: process.env.IP019_API_KEY!,
   });
   const app = createWebhookServer({
     ip019: pbx,
     wsStreamUrl: '',
     onCallStart: async (id, { from }) => {
       // הפק אודיו עברי מ-Azure, העלה ל-S3, ו-pbx.playPrompt(id, audioUrl)
     },
     onCallEnd: async () => {},
     onDtmf: async (id, digit) => {
       if (digit === '9') await pbx.transfer(id, '101');
     },
   });
   ```

## אופציה 3 — OpenAI Realtime + SIP נטיב

מבית OpenAI יצא תמיכת SIP נטיבית ב-Realtime API. במצב זה ה-PBX מנתב שיחות
ישירות ל-OpenAI ללא middleware. ראה `reference_openai_realtime_sip.md` במזכרים.
מתאים כשרוצים latency מינימלי ולא צריך לוגיקת דיאלוג מורכבת מצידנו.

## בדיקה מקומית

עם `ngrok`:
```bash
ngrok http 3000
# קח את ה-URL ושים אותו ב-TWILIO_WEBHOOK / IP019_WEBHOOK
```

## אבטחה

- **חתימת Twilio**: ודא חתימה של webhooks עם `twilio.validateRequest`.
- **IPSales**: השווה IP מקור לרשימת ה-IPs של המרכזייה.
- **TLS חובה**: כל webhook חייב HTTPS, אחרת Twilio יחסום.
- **PII**: הימנע מלוג של מספרי כרטיסי אשראי בתמלילים — השתמש בפילטר רגקס לפני שמירה.
