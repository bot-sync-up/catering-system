# TEMPLATES-CATALOG — קטלוג תבניות מלא

מסמך הפניה לכל התבניות בחבילה, ה-variables שלהן וההקשר שבו משתמשים בכל אחת.

---

## Email Templates

כל התבניות הן עברית RTL, MJML + Handlebars, רנדור מקומי דרך `EmailTemplates.render(id, data)`.
כל אחת מקבלת `brandName` ו-`unsubscribeUrl` כברירת מחדל מעל המשתנים הספציפיים.

### `welcome`
**מתי**: ברגע שמשתמש חדש מצטרף.
**Variables**:
| שם | סוג | דוגמה |
| --- | --- | --- |
| `brandName` | string | "Sync Up" |
| `firstName` | string | "משה" |
| `ctaUrl` | url | "https://app.syncup.co.il/login" |
| `unsubscribeUrl` | url | מיוצר אוטומטית |

### `orderConfirmation`
**מתי**: מיד אחרי checkout.
**Variables**: `brandName`, `firstName`, `orderNumber`, `orderDate`, `items[]` (`{ name, qty, priceFormatted }`), `subtotalFormatted`, `taxFormatted`, `totalFormatted`, `trackingUrl`, `unsubscribeUrl`.

### `paymentReceipt`
**מתי**: כשהתקבל תשלום, נשלח כקבלה רשמית.
**Variables**: `brandName`, `firstName`, `receiptNumber`, `amountFormatted`, `paymentMethod`, `paymentDate`, `pdfUrl`, `unsubscribeUrl`.

### `eventReminder`
**מתי**: 24 שעות לפני אירוע.
**Variables**: `brandName`, `firstName`, `eventName`, `eventDate`, `eventTime`, `eventLocation`, `calendarUrl`, `unsubscribeUrl`.

### `birthdayWish`
**מתי**: בבוקר יום ההולדת.
**Variables**: `brandName`, `firstName`, `couponCode`, `couponValue`, `couponUrl`, `unsubscribeUrl`.

### `npsRequest`
**מתי**: 7–14 ימים אחרי אינטראקציה משמעותית.
**Variables**: `brandName`, `firstName`, `surveyBaseUrl`, `unsubscribeUrl`.
**הערה**: כפתורי 0–10 נבנים כ-loop ב-Handlebars (`{{#each (range 0 10)}}`).

### `monthInvoice`
**מתי**: בתחילת כל חודש לכל לקוח B2B פעיל.
**Variables**: `brandName`, `firstName`, `monthName`, `year`, `invoiceNumber`, `totalFormatted`, `dueDate`, `pdfUrl`, `payUrl`, `unsubscribeUrl`.

### `deliveryEta`
**מתי**: כשהשליח קיבל את החבילה והתחיל לנהוג.
**Variables**: `brandName`, `firstName`, `orderNumber`, `etaWindow`, `driverName`, `driverPhone`, `trackingUrl`, `unsubscribeUrl`.

---

## SMS Templates

מגבלת תווים: סגמנט יחיד = 70 תווים יוניקוד (עברית). מעל זה כל סגמנט נספר בנפרד וגם משלם.

| id | sender | תוכן | משתנים |
| --- | --- | --- | --- |
| `otp` | SyncUp | הקוד שלך ל-{{brandName}}: {{code}}. תקף 5 דקות. אין לשתף. | `brandName`, `code` |
| `orderShipped` | SyncUp | הזמנה #{{orderNumber}} נשלחה! מעקב: {{trackUrl}} | `orderNumber`, `trackUrl` |
| `paymentReminder` | SyncUp | תזכורת: יתרת חוב {{amountFormatted}}. תשלום: {{payUrl}} | `amountFormatted`, `payUrl` |
| `eventToday` | SyncUp | תזכורת: היום בשעה {{time}} — {{eventName}}. {{location}} | `time`, `eventName`, `location` |
| `driverEta` | SyncUp | השליח {{driverName}} בדרך, צפוי בעוד {{minutes}} דק׳. {{trackUrl}} | `driverName`, `minutes`, `trackUrl` |
| `appointmentReminder` | SyncUp | תזכורת לתור: {{date}} בשעה {{time}} אצל {{provider}}. ביטול: {{cancelUrl}} | `date`, `time`, `provider`, `cancelUrl` |

**שם השולח (`SyncUp`)** דורש אישור מראש של כל המפעילים הסלולריים — ראה INTEGRATION-KEYS.md.

---

## WhatsApp Templates

חייבות להיות רשומות ומאושרות ב-Meta Business Manager עם זהות מלאה (`name` + `languageCode`).
ב-Meta כל פרמטר מסומן כ-`{{1}}, {{2}}, ...` והסדר חשוב.

### `order_confirmation` — utility — `he`
**גוף ב-Meta**: `שלום {{1}}, ההזמנה #{{2}} התקבלה. סה"כ: {{3}}. מעקב: {{4}}`
**Variables (ordered)**: `firstName`, `orderNumber`, `totalFormatted`, `trackingUrl`.

### `payment_reminder` — utility — `he`
**גוף**: `שלום {{1}}, תזכורת על תשלום {{2}} לתאריך {{3}}. תשלום: {{4}}`
**Variables**: `firstName`, `amountFormatted`, `dueDate`, `payUrl`.

### `event_day_reminder` — utility — `he`
**גוף**: `שלום {{1}}, היום {{2}} בשעה {{3}} ב-{{4}}. נתראה!`
**Variables**: `firstName`, `eventName`, `time`, `location`.

### `otp_login` — authentication — `he`
**גוף**: `קוד הכניסה שלך: {{1}}. תקף 5 דק׳.`
**Variables**: `code`.
**הערה**: ב-Meta בוחרים קטגוריה **Authentication** — מחיר מופחת ויותר לוקח על traffic של OTP.

---

## הוספת תבנית חדשה

### Email
1. יוצרים קובץ ב-`src/email/templates/yourTemplate.ts` המייצא `EmailTemplate` (subject + mjml + text + vars).
2. רושמים אותו ב-`src/email/templates/index.ts`.
3. (אופציונלי) יוצרים Dynamic Template תואם ב-SendGrid ומוסיפים `templateMap: { yourTemplate: 'd-xxx' }` ב-SendGridProvider — אז SendGrid יחליף את הרינדור המקומי.

### SMS
1. מוסיפים entry ל-`SMS_TEMPLATES` ב-`src/sms/templates/index.ts`.
2. שומרים תחת 70 תווים — אחרת זה כבר 2 סגמנטים.

### WhatsApp
1. מוסיפים entry ל-`WHATSAPP_TEMPLATES` ב-`src/whatsapp/templates/index.ts`.
2. רושמים תבנית זהה ב-Meta Business Manager.
3. ממתינים ל-approval (~דקות עד שעות).
