<div dir="rtl">

# פרטי התחברות — סביבת דמו

> כל הפרטים כאן הם דמו בלבד. אסור לעשות שימוש בנתונים אלה ב-production.

## URL ראשי

`https://demo-<slug>.syncup.co.il`

## משתמשים זמינים

### אדמין ראשי

- שם משתמש: `admin@demo.syncup.co.il`
- סיסמה: `Demo!Admin2026`
- הרשאות: גישה מלאה לכל המודולים
- שימוש בהדגמה: דשבורד מנכ"ל, BI, ניהול משתמשים

### מנהל סניף

- שם משתמש: `manager@demo.syncup.co.il`
- סיסמה: `Demo!Manager2026`
- הרשאות: ניהול אירועים, צוות, משימות
- שימוש בהדגמה: תרחיש החתונה, מנוי שנתי

### סוכן/עובד

- שם משתמש: `agent@demo.syncup.co.il`
- סיסמה: `Demo!Agent2026`
- הרשאות: ראייה אישית, ביצוע משימות
- שימוש בהדגמה: Kotlin app — clock in, משימות, מצלמה

### לקוח דמו

- שם משתמש: `customer@demo.syncup.co.il`
- סיסמה: `Demo!Customer2026`
- הרשאות: פורטל לקוחות בלבד
- שימוש בהדגמה: הזמנה עצמית דרך פורטל

### נהג

- שם משתמש: `driver@demo.syncup.co.il`
- סיסמה: `Demo!Driver2026`
- הרשאות: אפליקציית נהג
- שימוש בהדגמה: ניווט, חתימת לקוח, הוכחת מסירה

## API Tokens

- Public API: `demo_pk_test_<32_chars>`
- Webhook Secret: `demo_whsec_<32_chars>`

> Tokens מוחלפים אוטומטית כל 7 ימים. הסקריפט `reset-script.sh` מעדכן את הקובץ הזה.

## אינטגרציות דמו

| מערכת | חשבון | סיסמה |
|---|---|---|
| WhatsApp Sandbox | +972-50-DEMO-001 | -- |
| IP Sales PBX | ext 9999 | DemoPBX2026 |
| Bank Mock | demo-bank-user | DemoBank2026 |
| מס הכנסה Sandbox | 999999999 | -- |

</div>
