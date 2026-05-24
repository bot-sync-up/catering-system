<div dir="rtl">

# 09 — מדריך השגת מפתחות API (Integration Keys)

מדריך מלא איך לקבל כל מפתח שדרוש למערכת, איפה להזין אותו, ומה לבדוק.

---

## 1. iCount — חשבוניות מס/קבלה

### 1.1 פתיחת חשבון
1. גלוש ל-[https://www.icount.co.il](https://www.icount.co.il)
2. הירשם — דרושים: ח.פ./ת.ז., אימייל, טלפון
3. בחר חבילה (Basic מספיק להתחלה)
4. השלם אימות זהות + הסכם פתיחת חשבון

### 1.2 קבלת API Token
1. כנס ל-iCount ← **הגדרות ← API**
2. צור **Token חדש**
3. שמור את ה-`cid`, `user`, `pass`, `api_token`

### 1.3 הזנה במערכת
- **Admin ← Integrations ← iCount**
- הדבק את 4 השדות
- לחץ **Test Connection** — אמור להחזיר "OK"

### 1.4 בדיקה
- צור הזמנה דמה ← אשר תשלום ← ודא שהחשבונית נוצרה ב-iCount

---

## 2. Cardcom — סליקת אשראי

### 2.1 פתיחת חשבון
1. גלוש ל-[https://www.cardcom.solutions](https://www.cardcom.solutions)
2. צור קשר עם מכירות (חובה — לא רישום עצמי)
3. דרושים: עוסק מורשה/חברה, אישור בנק, חוזה
4. תקבל **TerminalNumber** + **API Username** + **API Password**

### 2.2 הגדרת Production vs Sandbox
- בקש מ-Cardcom גם **Sandbox credentials** לבדיקות
- אל תבדוק עם כרטיסים אמיתיים בפיתוח

### 2.3 הזנה במערכת
- **Admin ← Integrations ← Cardcom**
- הדבק: Terminal, User, Pass
- בחר **Mode**: Sandbox / Production

### 2.4 הגדרת Tokenization (אבטחת PCI)
- הפעל **Save Card for Recurring** — מאפשר שמירת אסימון
- ה-Cardcom שומר את הכרטיס, אנחנו שומרים רק Token

### 2.5 בדיקה
- ב-Sandbox: כרטיס בדיקה `4580458045804580` תוקף `12/29` CVV `123`
- צור הזמנה → סלוק → ודא חיוב מוצלח + Webhook חזרה

---

## 3. WhatsApp Business API (Meta)

### 3.1 דרישות מקדימות
- חשבון Facebook Business Manager
- אימות עסקי (Business Verification) — לוקח 1-3 שבועות
- מספר טלפון ייעודי (לא יכול להיות בשימוש ב-WhatsApp רגיל)

### 3.2 הקמת WABA
1. גלוש ל-[https://business.facebook.com](https://business.facebook.com)
2. **Business Settings ← WhatsApp Accounts ← Add**
3. הקצה מספר טלפון + אמת באמצעות OTP
4. צור **System User** עם הרשאות WhatsApp
5. צור **Permanent Access Token**

### 3.3 חיבור דרך ספק (BSP) — מומלץ
ספקים מומלצים:
- **Twilio** (יקר אך פשוט)
- **MessageBird**
- **360dialog**
- **Vonage**
- **GreenAPI** (זול לישראלים)

### 3.4 קבלת המפתחות
- `Phone Number ID`
- `Business Account ID`
- `Permanent Access Token`
- `Webhook Verify Token` (אתה ממציא)

### 3.5 הזנה במערכת
- **Admin ← Integrations ← WhatsApp**
- הדבק את 4 הערכים
- הגדר **Webhook URL** ב-Meta:
  `https://api.yourdomain.com/webhooks/whatsapp`
- ב-Meta אשר את ה-`Verify Token`

### 3.6 אישור תבניות הודעה (Templates)
- כל הודעה יזומה (Outbound) דורשת תבנית מאושרת
- Meta מאשרת תוך 24-48 שעות
- דוגמאות: order_confirmation, delivery_eta, payment_receipt

---

## 4. SendGrid — אימיילים

### 4.1 פתיחת חשבון
1. גלוש ל-[https://sendgrid.com](https://sendgrid.com)
2. הירשם (יש Free Tier — 100/יום)
3. השלם **Sender Authentication**:
   - SPF + DKIM + DMARC על הדומיין שלך
   - אמת דרך DNS (CNAME records)

### 4.2 יצירת API Key
1. **Settings ← API Keys ← Create**
2. בחר **Restricted Access** — תן רק `Mail Send`
3. שמור את המפתח (מוצג פעם אחת בלבד!)

### 4.3 הזנה במערכת
- **Admin ← Integrations ← SendGrid**
- הדבק `API Key`
- הזן `From Email` ו-`From Name` (מאומת)

### 4.4 בדיקה
- שלח אימייל בדיקה ← בדוק SPF/DKIM/DMARC ב-mail-tester.com
- ציון מינימלי רצוי: 9/10

---

## 5. Twilio — SMS + Voice

### 5.1 פתיחת חשבון
1. גלוש ל-[https://www.twilio.com](https://www.twilio.com)
2. הירשם — תקבל $15 קרדיט חינם
3. אמת מספר טלפון אישי

### 5.2 רכישת מספר ישראלי
- **Phone Numbers ← Buy a Number**
- חפש Country: Israel
- בחר מספר עם SMS Capability
- עלות: ~$2.5/חודש

### 5.3 קבלת Credentials
- **Console ← Account Info**:
  - `Account SID`
  - `Auth Token`
- שמור את המספר שרכשת (Sender ID)

### 5.4 הזנה במערכת
- **Admin ← Integrations ← Twilio**
- הדבק SID + Auth Token + Phone Number

### 5.5 הערה לישראל
- שולחי SMS לישראל דורשים רישום ב-משרד התקשורת
- Twilio מספקת **Pre-registered Sender ID** בתשלום נוסף
- חלופה: **019 Vision**, **Inforu**, **Cellact** (ישראליות)

---

## 6. Anthropic Claude API — AI

### 6.1 פתיחת חשבון
1. גלוש ל-[https://console.anthropic.com](https://console.anthropic.com)
2. הירשם עם אימייל / Google
3. אמת מספר טלפון
4. הוסף שיטת תשלום (Credits)

### 6.2 קבלת API Key
1. **Settings ← API Keys ← Create Key**
2. תן שם תיאורי (לדוגמה: "prod-tenant-acme")
3. שמור את המפתח (מוצג פעם אחת)

### 6.3 הגדרת Rate Limits
- **Settings ← Limits**
- הגדר Spend Limit חודשי כדי להימנע מהפתעות
- מומלץ: התחל ב-$50/חודש

### 6.4 הזנה במערכת
- **Admin ← Integrations ← Anthropic**
- הדבק `API Key`
- בחר Model ברירת מחדל: `claude-opus-4-7` או `claude-sonnet-4-7`

### 6.5 בדיקה
- מסך ה-AI Chatbot ← שלח שאלה ← ודא תשובה רהוטה

---

## 7. אבטחת מפתחות

### 7.1 כלל ברזל
- **לעולם לא** ב-Git / קבצים פתוחים
- אחסון: Vault / Doppler / AWS Secrets Manager / .env מוצפן
- במערכת — מפתחות מוצפנים ב-DB עם AES-256

### 7.2 Rotation (החלפה תקופתית)
- כל 90 יום למפתחות Production
- מיד אם יש חשד לדליפה
- ניתן לבצע דרך ה-UI (לא משבית את הקיים מיד)

### 7.3 חירום — דליפת מפתח
1. **בטל מיד** בלוח הבקרה של הספק
2. צור מפתח חדש
3. עדכן במערכת
4. בדוק Audit Log לפעולות חשודות
5. דווח ל-DPO (אם רלוונטי GDPR)

---

## 8. טבלת סיכום — Quick Reference

| ספק | מסך הגדרה | מפתח עיקרי | זמן הקמה |
|---|---|---|---|
| iCount | Integrations ← iCount | api_token | 1-2 ימים |
| Cardcom | Integrations ← Cardcom | Terminal+User+Pass | 5-10 ימים |
| WhatsApp | Integrations ← WhatsApp | Permanent Token | 1-3 שבועות |
| SendGrid | Integrations ← SendGrid | API Key | 1-2 שעות |
| Twilio | Integrations ← Twilio | SID + Auth | 1 שעה |
| Anthropic | Integrations ← Anthropic | API Key | 15 דקות |

</div>
