# מערכת ניהול אירועים

מערכת מלאה לניהול אירועים בעברית עם RTL.

## תכולה
- **Gantt חזותי** (frappe-gantt) עם drag לשינוי תאריכים ו-resize להתקדמות.
- **צ'קליסטים מקוננים** (parent/child) עם אחוזי התקדמות אוטומטיים.
- **צוות** — שיוך אנשים לאירוע + תפקיד + פרטי קשר.
- **סטטוס בזמן אמת** דרך SSE (Server-Sent Events).
- **Debrief** לאחר אירוע (מה עבד, מה נכשל, שיפורים, דירוג).
- **אולם** — פרטים, איש קשר, קיבולת, הגבלות.
- **ציוד** — קטלוג, תנועות שליחה/החזרה, זיהוי חוסרים אוטומטי.
- **השכרת ציוד עם חיוב אוטומטי** — חישוב לפי ימים × מחיר יומי × כמות.

## התקנה והרצה
```
cd event-manager
npm install
npm start
```
פתח: `http://localhost:3000`

## Schema
- `Venue` (אולם)
- `Event` (אירוע)
- `EventTask` עם parent_id (היררכי)
- `StaffAssignment`
- `Equipment` (קטלוג)
- `EquipmentMovement` (שליחה/החזרה/חוסרים)
- `EquipmentRental` (השכרה + חיוב)
- `Debrief`

## API עיקרי
- `GET/POST /api/events`
- `GET /api/events/:id` (כולל tasks, staff, equipment, rentals, debrief)
- `POST /api/events/:id/tasks` · `PUT /api/tasks/:id` · `DELETE /api/tasks/:id`
- `POST /api/events/:id/staff`
- `POST /api/events/:id/equipment-movement` · `PUT /api/equipment-movement/:id/return`
- `POST /api/events/:id/rental` (חיוב אוטומטי)
- `POST /api/events/:id/debrief`
- `GET /api/stream` (SSE - אירועים בזמן אמת)
