# מערכת לוגיסטיקה ומשלוחים

פלטפורמת ניהול לוגיסטיקה ומשלוחים בעברית (RTL).

## תכונות

- **ניהול צי רכב + מעקב**: רישום רכבים, מצב, GPS אחרון
- **קבלני נהגים**: ניהול נהגים פנימיים וקבלנים חיצוניים
- **שיבוץ נהג**: ממשק שיבוץ למשלוחים
- **תיעוד מסירה**: חתימה דיגיטלית, צילום, GPS, חותמת זמן
- **ניווט**: קישורי deep link ל-Waze ו-Google Maps
- **התראות ETA**: שליחת SMS/WhatsApp עם זמן הגעה משוער
- **חשבוניות נהגים קבלנים**: DriverInvoice
- **Geofencing**: hook להתראות על כניסה/יציאה מאזור
- **תכנון מסלול בסיסי**: route planner

## הרצה

```bash
npm install
npm start
```

השרת יעלה על http://localhost:3000

## מבנה

- `server/` - Backend Node/Express
  - `index.js` - שרת ראשי
  - `db/` - בסיס נתונים SQLite (schema + initialization)
  - `routes/` - REST API endpoints
- `public/` - Frontend (HTML/CSS/JS, RTL Hebrew)
- `uploads/` - קבצים שהועלו (תמונות מסירה, חתימות)

## מצבי משלוח (Status)

`assigned` → `en_route` → `arrived` → `delivered`

## API עיקרי

- `GET/POST /api/deliveries` - רשימת/יצירת משלוחים
- `POST /api/deliveries/:id/assign` - שיבוץ נהג
- `POST /api/deliveries/:id/status` - עדכון מצב
- `POST /api/deliveries/:id/proof` - תיעוד מסירה (חתימה+תמונה+GPS)
- `GET/POST /api/drivers` - נהגים
- `GET/POST /api/vehicles` - רכבים
- `GET /api/invoices` - חשבוניות נהגים קבלנים
- `POST /api/eta/notify` - שליחת SMS/WhatsApp
- `GET /api/geofence/check` - hook לבדיקת geofencing
