# INTEGRATION-KEYS — איך להשיג מפתחות לכל ספק

מסמך פעולה לקליטת ספקי תקשורת חדשים. כל סעיף מסתיים בערכים שצריך להזריק כ-env vars.

---

## 1. SendGrid (Email)

### השגת API Key

1. נכנסים ל-https://app.sendgrid.com → **Settings → API Keys → Create API Key**.
2. סוג ההרשאות: **Restricted Access**, מאפשרים רק `Mail Send` ו-`Tracking` (write/read לפי הצורך).
3. שומרים את ה-key — הוא יוצג פעם אחת בלבד.

### Domain Authentication

לפני שליחה ל-prod חובה לאמת את ה-domain שלך (אחרת SPF/DKIM ייפלו וההודעות יגיעו לספאם):
1. **Settings → Sender Authentication → Authenticate Your Domain**.
2. מוסיפים את רשומות ה-CNAME שמופיעות אצלכם ב-DNS (אצלנו זה Cloudflare של `syncup.co.il`).
3. ממתינים ~15 דקות ועושים **Verify**.

### Dynamic Templates

1. **Email API → Dynamic Templates → Create a Dynamic Template**.
2. יוצרים template ומקבלים `d-xxxxxx` id.
3. מזריקים ל-`SendGridProvider` דרך `templateMap`:
   ```ts
   new SendGridProvider({ apiKey, fromEmail, templateMap: { welcome: 'd-abc123', orderConfirmation: 'd-def456' } });
   ```

### Event Webhook

1. **Settings → Mail Settings → Event Webhook**.
2. HTTPS POST URL: `https://api.syncup.co.il/webhooks/sendgrid`.
3. מסמנים: `delivered`, `bounced`, `opened`, `clicked`, `unsubscribed`, `spam_report`, `dropped`.
4. מפעילים **Signed Event Webhook** ושומרים את ה-Public Key (Base64).

### env vars
```
SENDGRID_API_KEY=SG.xxxxxxxx
SENDGRID_FROM_EMAIL=no-reply@syncup.co.il
SENDGRID_WEBHOOK_PUBLIC_KEY=MFAwBQ... (base64)
```

---

## 2. 019 SMS (Israel)

### פתיחת חשבון

1. נכנסים ל-https://019.co.il → סעיף **API for SMS**.
2. מתקשרים למחלקה המסחרית (03-9008888) — אין self-serve, החשבון נפתח אחרי שיחה.
3. מבקשים:
   - **שם משתמש (username/SSN)** ו-**סיסמה** ל-XML API
   - **Sender name (source)** — שם השולח שיופיע ב-SMS. אלפא-נומרי עד 11 תווים או מספר טלפון. דורש אישור של כל המפעילים הסלולריים (~5 ימי עסקים).

### Delivery Notification URL

ב-portal של 019 מגדירים URL לדיווחי מסירה: `https://api.syncup.co.il/webhooks/019`.

### env vars
```
SMS_019_USERNAME=...
SMS_019_PASSWORD=...
SMS_019_SOURCE=SyncUp
```

---

## 3. Twilio (SMS — fallback בינלאומי)

1. https://console.twilio.com → רוכשים מספר ב-**Phone Numbers → Buy a number**.
2. ב-**Account → API Keys & Tokens** שולפים את **Account SID** ו-**Auth Token**.
3. ליצירה מסיבית מומלץ ליצור **Messaging Service** (`Messaging → Services`) ולקבל `MGxxxxxx` SID — נותן rotation בין מספרים, sticky sender ו-fallback אוטומטי.
4. ב-Messaging Service → **Integration** מגדירים Status Callback: `https://api.syncup.co.il/webhooks/twilio`.

### env vars
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_FROM=MG...   # או מספר E.164 כמו +12025550100
TWILIO_FROM_IS_MESSAGING_SERVICE=true
```

---

## 4. WhatsApp Business (Meta Cloud API)

### Meta Business Manager

1. https://business.facebook.com → **Settings → Business Settings**.
2. יוצרים **WhatsApp Business Account (WABA)** ומקשרים אליו מספר טלפון.
3. ה-PHONE NUMBER ID יופיע ב-**WhatsApp → API Setup** (זה שונה מהמספר עצמו — זה id פנימי כמו `109876543210`).

### App + Permanent Token

1. https://developers.facebook.com/apps → **Create App** מסוג **Business**.
2. מוסיפים את ה-product **WhatsApp**.
3. ב-**System Users** (ב-Business Settings) יוצרים System User מסוג Admin → **Generate Token** עם הרשאות `whatsapp_business_messaging`, `whatsapp_business_management`. **בוחרים Token Expiration = Never** — אחרת תצטרכו לסבב אותו.

### Templates Approval

תבניות (ב-`src/whatsapp/templates/index.ts`) חייבות להיות רשומות ומאושרות ב-Meta:
1. **WhatsApp Manager → Message Templates → Create Template**.
2. שם זהה ל-`name` בקוד (לדוגמה `order_confirmation`).
3. שפה זהה ל-`languageCode` (לדוגמה `he`).
4. בגוף משתמשים ב-`{{1}}, {{2}}, ...` באותו סדר כמו `variables` בקוד.

### Webhook

1. ב-https://developers.facebook.com/apps/{APP_ID}/whatsapp-business/wa-settings/ → **Configuration → Webhook**.
2. Callback URL: `https://api.syncup.co.il/webhooks/whatsapp`.
3. **Verify Token** — מחרוזת חזקה לבחירתך (יישמר בקונפיג).
4. מנויים: `messages`.
5. **App Secret** נמצא ב-**App Settings → Basic** (משמש לאימות `X-Hub-Signature-256`).

### env vars
```
WA_ACCESS_TOKEN=EAAxxxxxx       # permanent token
WA_PHONE_NUMBER_ID=109876543210
WA_VERIFY_TOKEN=long-random-string
WA_APP_SECRET=xxxxxxxx
```

---

## 5. Expo Push

1. https://expo.dev → **Access Tokens → Create**.
2. השרת יכול לשלוח גם בלי token, אבל token נדרש כדי לראות receipts ולא להיחסם ב-rate-limit.

### env vars
```
EXPO_ACCESS_TOKEN=xxx
```

---

## 6. Firebase Cloud Messaging (FCM)

1. https://console.firebase.google.com → **Project Settings → Service accounts → Generate new private key**.
2. שומרים את ה-JSON. אסור לקומיט אותו — מזריקים כ-env JSON-מקודד או דרך secret manager.

### env vars
```
FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

---

## 7. Apple Push (APNs)

1. https://developer.apple.com/account → **Certificates, Identifiers & Profiles → Keys → +**.
2. מסמנים **Apple Push Notifications service (APNs)** → **Continue → Register**.
3. מורידים את קובץ ה-.p8, רושמים את ה-**Key ID** ואת ה-**Team ID**.

### env vars
```
APNS_KEY=---BEGIN PRIVATE KEY--- ...
APNS_KEY_ID=ABC123XYZ
APNS_TEAM_ID=DEF456UVW
APNS_TOPIC=co.il.syncup.driver
APNS_PRODUCTION=true
```

---

## רשימת בדיקה לפני production

- [ ] SendGrid: domain authenticated + Event Webhook חתום
- [ ] 019: sender name אושר אצל כל המפעילים
- [ ] WhatsApp: כל התבניות `WHATSAPP_TEMPLATES` רשומות ומאושרות
- [ ] WhatsApp: `WA_VERIFY_TOKEN` ב-env זהה לזה שב-Meta
- [ ] Expo: token עם הרשאות `push notifications` בלבד
- [ ] FCM: service account JSON ב-secret manager, לא ב-git
- [ ] APNs: production flag מסונכרן עם build-mode של האפליקציה
- [ ] consent ledger רץ ומחובר (`setConsentLedger(...)`)
- [ ] audit sink מחובר ל-Postgres / Datadog (`setAuditSink(...)`)
- [ ] cost store מחובר (`setCostStore(...)`)
- [ ] rate-limit backend = Redis (`setRateLimitBackend(...)`)
