<div dir="rtl">

# 08 — מדריך אדמין מערכת (RBAC + Integrations + Settings)

## 1. גישה לאזור האדמין

- **כתובת**: `https://app.yourdomain.com/admin`
- דרושות הרשאות `tenant_admin` או `super_admin`
- מומלץ להפעיל MFA לכל משתמש אדמין (חובה ב-Production)

## 2. ניהול משתמשים (Users)

### 2.1 הוספת משתמש
1. **Admin ← Users ← + New User**
2. שדות חובה: שם, אימייל, טלפון, תפקיד
3. אופציה: שליחת הזמנה אוטומטית למייל
4. סיסמה ראשונית מאופסת ע"י המשתמש בכניסה הראשונה

### 2.2 השעיה / מחיקה
- **Suspend** — משבית כניסה, שומר היסטוריה
- **Delete** — מחיקה לוגית (Soft Delete) — לא ניתן לבצע על משתמש עם הזמנות

### 2.3 ניהול סשנים
- צפייה בסשנים פעילים לכל משתמש
- כפתור **Force Logout** למקרי חירום
- Audit Log של כל כניסה/יציאה

## 3. תפקידים והרשאות (RBAC)

### 3.1 תפקידים מוגדרים מראש
| תפקיד | תיאור |
|---|---|
| `super_admin` | גישה מלאה לכל ה-tenants |
| `tenant_admin` | אדמין של הארגון |
| `manager` | מנהל כללי — CRM + Orders + Reports |
| `chef` | מטבח + ייצור + מלאי |
| `kitchen_staff` | KDS בלבד |
| `driver` | אפליקציית נהג |
| `accountant` | חשבונאות + חשבוניות |
| `customer_support` | תמיכת לקוחות |
| `viewer` | קריאה בלבד |

### 3.2 יצירת תפקיד מותאם
1. **Admin ← Roles ← + New Role**
2. בחר Permissions לפי Scope (Customers, Orders, Inventory וכו')
3. עבור כל Scope — בחר Actions: `view`, `create`, `edit`, `delete`, `export`
4. שמור ושייך למשתמשים

### 3.3 מטריצת הרשאות (דוגמה)

| Scope \ Role | Manager | Chef | Driver | Accountant |
|---|---|---|---|---|
| Customers | CRUD | View | View | View |
| Orders | CRUD | View+Edit | View+Update | View |
| Menus | CRUD | CRUD | — | View |
| Inventory | View | CRUD | — | View |
| Payments | View | — | Update | CRUD |
| Reports | All | Kitchen | Own | Finance |

## 4. אינטגרציות (Integrations)

### 4.1 ניהול חיבורים
- **Admin ← Integrations** — רשימת כל החיבורים
- מצב לכל אינטגרציה: `Connected` / `Disconnected` / `Error`
- אפשרות **Test Connection** לפני שימוש

### 4.2 אינטגרציות זמינות
- **iCount** — חשבוניות
- **Cardcom** — סליקה
- **WhatsApp Business** — הודעות
- **SendGrid** — אימיילים
- **Twilio** — SMS
- **Anthropic Claude API** — AI Chatbot, סיכומים, סיווג
- **Google Maps / Waze** — ניווט נהגים
- **Slack / Teams** — התראות פנימיות
- **Zapier / Make** — אוטומציות

### 4.3 Webhooks
- **Admin ← Webhooks ← + New**
- אירועים זמינים: `order.created`, `order.delivered`, `payment.succeeded`, `customer.created` וכו'
- אבטחה: HMAC Signature חתום ב-secret

### 4.4 API Keys
- **Admin ← API Keys**
- יצירת מפתח עם Scope מוגדר
- אפשרות **Rotate** (החלפה)
- Rate limit לכל מפתח

## 5. הגדרות ארגון (Settings)

### 5.1 פרטי עסק
- שם חוקי, ח.פ., כתובת
- לוגו (PNG עם רקע שקוף)
- שפת ברירת מחדל
- אזור זמן + מטבע
- שעות פעילות + ימי סגירה

### 5.2 ברנדינג
- צבעים ראשי + משני
- פונט מותאם
- תבנית מייל מותאמת
- Favicon ו-Splash Screen

### 5.3 ימי חג ועונות
- **Admin ← Calendar ← Holidays**
- ייבוא לוח חגים יהודי / כללי
- אפשרות "סגור / משלוחים מצומצמים / מחיר מיוחד"

### 5.4 מסי מע"מ
- שיעור מע"מ ברירת מחדל (17% / 18% / פטור)
- אפשרות שיעורים שונים לפי קטגוריה

### 5.5 שיטות תשלום
- הפעלה/השבתה של אמצעי תשלום
- עמלות סליקה (לתצוגה ללקוח אם רלוונטי)

### 5.6 משלוחים
- אזורי חלוקה (Polygon על המפה)
- דמי משלוח לכל אזור
- סף מינימום להזמנה
- חלונות זמן זמינים

## 6. אבטחת מידע (Security Settings)

### 6.1 מדיניות סיסמאות
- אורך מינימום (8/12/16)
- חובת תווים מיוחדים
- ריקבון סיסמה (90/180 יום)
- חסימת סיסמאות נפוצות (haveibeenpwned)

### 6.2 MFA
- **Optional / Required for Admins / Required for All**
- שיטות: TOTP (Google Authenticator), SMS, Email

### 6.3 IP Whitelist
- אופציה לחסום כניסה רק מ-IPs מאושרים (לאדמינים)

### 6.4 Audit Log
- **Admin ← Audit Log**
- כל פעולה רגישה נשמרת
- שמירה 7 שנים (לפי דרישות חוק)
- Export ל-CSV

## 7. גיבויים והתאוששות

### 7.1 גיבוי אוטומטי
- יומי — 30 ימים אחרונים
- שבועי — 12 שבועות אחרונים
- חודשי — 12 חודשים אחרונים
- מוצפן + בענן נפרד (S3 cross-region)

### 7.2 שחזור
- בקשה דרך **Support Ticket**
- RPO: 24 שעות, RTO: 4 שעות

### 7.3 ייצוא נתונים (GDPR)
- כל לקוח / משתמש יכול לבקש ייצוא של הנתונים שלו
- **Admin ← Data Privacy ← Export Request**

## 8. תוכניות ו-Billing

- **Admin ← Plan & Billing**
- צפייה בתוכנית פעילה
- שדרוג / שדרוג זמני
- היסטוריית חשבוניות
- ניהול שיטת תשלום

## 9. צ'ק-ליסט הקמה ראשונית (Day 1)

- [ ] הגדרת פרטי עסק + לוגו + ברנדינג
- [ ] הקמת משתמשים + הקצאת תפקידים
- [ ] חיבור iCount + Cardcom
- [ ] חיבור WhatsApp + SendGrid + Twilio
- [ ] הגדרת מע"מ + שיטות תשלום
- [ ] הגדרת אזורי חלוקה ודמי משלוח
- [ ] ייבוא לקוחות + תפריט (סקריפטים ב-`scripts/`)
- [ ] בדיקה מקצה לקצה: הזמנה ← מטבח ← נהג ← לקוח
- [ ] הפעלת MFA לכל האדמינים
- [ ] בדיקת גיבוי + שחזור

</div>
