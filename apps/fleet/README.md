# Fleet — מערכת ניהול צי רכבים

מערכת מקיפה לניהול צי רכב בעברית עם RTL מלא.

## רכיבים
- **api** — Node.js + Express + Prisma + PostgreSQL + BullMQ (Redis)
- **web** — React + Vite + Tailwind (RTL עברית)
- **mobile** — React Native (Expo) — אפליקציית נהג

## תכונות
- כרטיסיית רכב (פרטים, נהג, צילומים)
- תוקפים: טסט, חובה, מקיף, רישוי + התראות 60/30/7 ימים
- שוטפים: דלק, טיפולים, תיקונים, קנסות (+ צילום קבלה)
- דוחות חודשי/שנתי (PDF)
- נסועה למס הכנסה (Mileage report)
- אפליקציית נהג: דיווח דלק/נסועה, צפייה בהתראות

## הרצה
```bash
# API
cd api
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev

# Web
cd web
npm install
npm run dev

# Mobile
cd mobile
npm install
npm start
```

## Schema
- `Vehicle` — plate, make, model, year, fuel, driverId, vin, color, …
- `VehicleDocument` — type (test/חובה/מקיף/license), issueDate, expiry, fileUrl
- `VehicleExpense` — type (fuel/service/repair/fine), amount, date, vendor, receiptUrl, mileage
- `Mileage` — vehicleId, date, km, purpose (business/private)
- `Driver` — name, phone, license#, expiry
- `Alert` — vehicleId, documentId, fireAt, level (60/30/7), sent
