# Marketing Platform — פלטפורמת שיווק, קמפיינים וצ'אט-בוט

פלטפורמה מקיפה (RTL עברית) לניהול שיווק רב-ערוצי, קמפיינים, סגמנטציה דינמית, סקרי NPS, ניהול קריאות שירות (Ticketing), ייחוס UTM, ROI וצ'אט-בוט מבוסס Claude.

## ערוצים נתמכים

- **Email** — SendGrid (תבניות HTML RTL)
- **SMS** — 019 ו-Twilio (fallback)
- **WhatsApp** — Cloud API (Meta)
- **Web Push** (אופציונלי)

## תכונות עיקריות

- Campaign Builder Drag&Drop + A/B Testing
- סגמנטציה דינמית בזמן אמת (live segments)
- תזכורות אוטומטיות (BullMQ)
- ייחוס UTM (multi-touch attribution) + חישוב ROI
- אינטגרציות Facebook/Instagram/Google Ads
- סקרי NPS אוטומטיים
- מערכת Ticketing מלאה
- KPI Dashboard
- Chatbot מבוסס Claude (FAQ, סטטוס, הצעות, escalation)

## הרצה

```bash
npm install
npm run db:migrate
npm run dev
```

ראה `.env.example` עבור משתני סביבה.
