<div dir="rtl">

# הקמת Demo Tenant חדש

מדריך להקמת סביבת דמו עצמאית עם נתוני seed מלאים.

## דרישות מקדימות

- גישה ל-G6 (קישור פנימי)
- חיבור לסביבת ה-staging של Sync Up
- מפתח API פעיל מסוג `demo-provisioning`
- Node.js 20+ ו-pnpm 9+

## שלב 1 — יצירת ה-tenant

```bash
pnpm tsx ./customer-demo/provisioning/create-sandbox-tenant.ts \
  --name "Demo - שם הלקוח" \
  --domain "demo-<slug>.syncup.co.il" \
  --plan "trial-14d" \
  --seed full
```

הסקריפט יוצר:

1. tenant חדש עם schema נפרד ב-Postgres
2. אדמין ראשי + 3 סוכנים + 5 לקוחות דמו
3. נתוני seed: 200 הזמנות, 50 משימות, 30 משלוחים, P&L של 6 חודשים
4. סימון `DEMO MODE` בכל ה-UI (ראה `provisioning/watermark.ts`)
5. תזכיר מחיקה אוטומטית אחרי 30 יום

## שלב 2 — הגדרת אינטגרציות דמו

- WhatsApp Business — מספר sandbox רשמי של Meta
- IP Sales PBX — extension דמו 9999
- מס הכנסה — sandbox endpoint
- בנקים — Mock API שמחזיר תנועות מדומות

## שלב 3 — אימות תקינות

```bash
./customer-demo/demo-environment/health-check.sh
```

הסקריפט מאמת:

- כל ה-endpoints מחזירים 200
- ה-seed עלה במלואו
- ה-watermark מופיע
- ההזמנות הדמו מציגות סטטוסים תקינים

## שלב 4 — שיתוף עם הלקוח

הענק ללקוח את הפרטים מ-`credentials.md` וקבע פגישת הדגמה תוך 48 שעות.

## ניקוי

לאחר 30 יום ה-tenant נמחק אוטומטית. למחיקה ידנית:

```bash
pnpm tsx ./customer-demo/provisioning/delete-sandbox-tenant.ts --domain demo-<slug>.syncup.co.il
```

</div>
