# Customer Portal — Next.js 15

פורטל לקוחות RTL בעברית, mobile-first.

## פיצ'רים
- התחברות אימייל + OTP (קוד 6 ספרות; בדמו מוצג במסך).
- דשבורד עם הזמנה פעילה ופעולות מהירות.
- תפריט מותאם אישית (העדפות + הסתרת קטגוריות + מועדפים).
- Flow הזמנה: תפריט → עגלה → Cardcom iframe stub → תשלום מיידי → סטטוס חי.
- מעקב סטטוס דרך SSE: הוזמן → אושר → בהכנה → במשלוח → נמסר.
- היסטוריה + הורדת חשבונית PDF.
- מערכת פניות (Ticketing) עם תגובות אוטומטיות לדמו.
- דירוג 5 כוכבים + טקסט משוב.

## הרצה
```bash
cd apps/customer-portal
npm install
npm run dev
```

## משתמש דמו
- אימייל: `demo@example.com`
- קוד OTP מופיע בקונסול וגם בדף ההתחברות (לדמו בלבד).

## ארכיטקטורה
- Next.js 15 App Router, React 19, TypeScript strict.
- Tailwind CSS, RTL, פונט Heebo.
- Store בזיכרון (`src/lib/store.ts`) — להחליף בפרודקשן ב-Postgres/Prisma.
- SSE: `/api/orders/[id]/stream` עם EventEmitter.
- Cardcom: stub ב-`/api/checkout/cardcom` + `/checkout` עמוד דמו.
