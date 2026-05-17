<div dir="rtl">

# Phased Launch Plan — תכנית השקה הדרגתית

**עקרון מנחה**: אין Big-Bang. עליה הדרגתית לפרודקשן, פיילוט לפני המוני, חוסר תלות חזקה בין Phases.

**Definition of Done לכל Phase**: כל Acceptance Criteria מסומנים ✓, לקוח פיילוט חתם על UAT, אין רגרסיות פתוחות בחומרה Critical/High.

---

## 📌 Phase 0 — Critical Fixes (שבועיים, D-60 → D-46)

**מטרה**: לסגור את כל חוסמי ה-Launch הקריטיים לפני שניגעים במשהו אחר.

### היקף
1. **תיקון מע"מ 18%** בכל הקוד + tests מקיפים
2. **חיבור אמיתי לחשבונית ירוקה (או iCount)** — adapter יחיד מחובר ועובד end-to-end
3. **הסרת sql.js** מכל המודולים בפרודקשן — העברה ל-API + PostgreSQL
4. **כיסוי בדיקות 70%** ב-Payments, Invoicing, Inventory transactions
5. **תיקון 10 ה-stubs הקריטיים ביותר** בזרימת הליבה
6. **WCAG 2.1 AA** — תיקוני נגישות בדפי ליבה (CRM, Event, Invoice)

### Deliverables
- ✓ דוח QA חתום על כל הסעיפים
- ✓ Pen-test ראשוני (אוטומטי + סקירת קוד ידנית)
- ✓ Backup/Restore Drill מתועד
- ✓ Staging mirror של production הוקם

### צוות
- 4 מפתחים Full-time
- 2 QA
- 1 DevOps חצי משרה
- יועץ נגישות חיצוני (3 ימים)

### Exit Criteria
- 0 חוסמים פתוחים מתוך `KNOWN-GAPS.md` סעיף 1
- Pen-test ללא ממצא Critical
- Load test בסיסי עובר (100 משתמשים מקבילים, P95 < 2s)

---

## 🚀 Phase 1 — Core Flow Live (חודש, D-45 → D-15)

**מטרה**: זרימת ליבה עובדת לפרודקשן ללקוח פיילוט אחד.

### היקף פונקציונלי
זרימת End-to-End:
```
לקוח חדש (CRM) → אירוע חדש → תפריט → הצעת מחיר → אישור → חשבונית → תשלום
```

### מודולים פעילים
1. CRM — ניהול לקוחות
2. Events — ניהול אירועים
3. Catalog — קטלוג מנות
4. Menus — בניית תפריטים
5. Quotes — הצעות מחיר (כולל חתימה דיגיטלית בסיסית)
6. Invoicing — חשבוניות מס/קבלה דרך חשבונית ירוקה
7. Basic Dashboard — לוח בקרה ראשי

### Deliverables
- ✓ 1 לקוח פיילוט פעיל בפרודקשן
- ✓ Onboarding flow מלא (Wizard)
- ✓ תיעוד משתמש בעברית מלא
- ✓ סרטוני הדרכה (5 סרטונים בני 3-5 דקות)
- ✓ מוקד תמיכה L1 מאויש בשעות העבודה

### Exit Criteria
- לקוח פיילוט מפיק 20+ חשבוניות אמיתיות
- Uptime > 99% ב-30 ימים
- אין באג Critical פתוח > 24h
- NPS פיילוט > 6

---

## 💰 Phase 2 — Finance Integrations Real (חודש, D-14 → D+15)

**מטרה**: לחבר באמת את כל מערכות הכספים.

### היקף
1. **Hashavshevet** — סנכרון דו-כיווני (חשבוניות + תקבולים)
2. **סליקת אשראי** — Tranzila/Cardcom (Tokenization, PCI compliant)
3. **דוחות מע"מ** — דו"ח 874 אוטומטי לרשות המסים
4. **מערכת תקבולים מתקדמת** — צ'קים דחויים, הוראות קבע, BIT
5. **דוחות ניהול כספי** — תזרים מזומנים, חייבים/זכאים
6. **טיפול בהחזרים וזיכויים** — חשבונית זיכוי
7. **טופס 102 הכנה** (חודשי) — בשיתוף עם Phase 3
8. **דשבורד פיננסי למנהל** — KPIs כספיים

### Deliverables
- ✓ אינטגרציה דו-כיוונית מאומתת על 100+ טרנזקציות
- ✓ דוח חודשי מצטבר תואם רואה חשבון
- ✓ סליקת אשראי חיה — לפחות 50 עסקאות

### Exit Criteria
- רואה חשבון של לקוח פיילוט מאשר את הזרימה
- 0 שגיאות סנכרון > 48 שעות
- מערכת ניהול חוסר תאימות (Reconciliation Dashboard)

### לקוחות חדשים מותרים
- עד 5 לקוחות נוספים בסוף Phase 2

---

## 👥 Phase 3 — HR + Payroll + BI (חודש, D+16 → D+45)

**מטרה**: הרחבה לניהול עובדים, שכר ודוחות מנהלים.

### היקף
1. **HR בסיסי** — תיק עובד, חוזים, חופשות, מחלה
2. **Time Tracking** — דיווח שעות עבודה (web + עתידי mobile ב-Phase 4)
3. **Payroll** — חישוב שכר חודשי, ניכויים, הוצאת תלוש (PDF + שליחה)
4. **טופס 102, 126, 161** — דיווחים לרשות המסים
5. **Pension/Provident Fund Integration** — קופות גמל וביטוח לאומי
6. **BI Module** — דשבורד מנהלים עם 20+ KPIs
7. **Custom Reports Builder** — בונה דוחות drag-drop
8. **Predictive Analytics** ראשוני — חיזוי הכנסות, מגמות

### Deliverables
- ✓ תלושי שכר מופקים אמיתיים ל-50 עובדים
- ✓ דוח 102 חודשי תקין
- ✓ BI Dashboard בפרודקשן
- ✓ Custom reports — 5 תבניות מובנות

### Exit Criteria
- חישוב שכר תואם 100% חישוב ידני (השוואה על 3 חודשים)
- אישור מהנהלת חשבונות + יועץ מס
- דשבורד נטען ב-< 3s

### לקוחות חדשים מותרים
- עד 15 לקוחות בסך הכל

---

## 📱 Phase 4 — Mobile + Public Portal (חודש, D+46 → D+75)

**מטרה**: נגישות לעובדי שטח ולקוחות סופיים.

### היקף
1. **Mobile App לעובדי שטח** (React Native / Expo)
   - דיווח שעות + GPS Check-in
   - צפייה באירועים של היום
   - רשימת משימות
   - שיחות וניווט לכתובת אירוע
   - מצב Offline ל-24h
2. **Customer Portal (Public)** — אזור לקוח
   - צפייה באירועים עתידיים
   - תשלום חשבוניות online
   - בקשות שינוי/הזמנה חדשה
   - מסמכים והיסטוריה
3. **Driver Routing** — Google Maps + אופטימיזציה
4. **Calendar Integration** — Google/Outlook
5. **Push Notifications** — FCM/APNS
6. **SMS Notifications** — InforU
7. **PWA לאופציונלי** — לעקיפת חנות אם נדרש

### Deliverables
- ✓ App פורסם ב-Google Play + App Store
- ✓ פורטל לקוחות פעיל ב-customers.example.co.il
- ✓ 30%+ מהעובדים מדווחים שעות דרך App

### Exit Criteria
- אישור Google Play + Apple App Review עברו
- Uptime פורטל ציבורי > 99.5%
- אבטחה — Pen-test מיוחד לפורטל ציבורי

### לקוחות חדשים מותרים
- 40+ לקוחות

---

## 📣 Phase 5 — Marketing + AI (חודש+, D+76 → D+105+)

**מטרה**: כלי שיווק מתקדמים ו-AI להעצמת ערך.

### היקף
1. **Marketing Automation**
   - קמפיינים אוטומטיים (יום הולדת, אירוע אחרון לפני שנה)
   - Drip campaigns
   - Email Templates ב-Hebrew RTL
   - A/B testing
2. **WhatsApp Business Integration**
   - הודעות אישור
   - תזכורות
   - Templates מאושרי Meta
   - Bot שירות בסיסי
3. **AI Menu Planner**
   - הצעות תפריט לפי תקציב + מספר אורחים + סוג אירוע
   - העדפות תזונה (כשר, צמחוני, ללא גלוטן)
   - הצעת מחיר אוטומטית
4. **AI Chat Assistant** למשתמשי המערכת
5. **Review Management** — איסוף ביקורות + Google Reviews integration
6. **Loyalty Program** — נקודות, הטבות
7. **Referral System** — שיתוף + תגמול

### Deliverables
- ✓ קמפיין אוטומטי ראשון רץ
- ✓ WhatsApp פעיל עם 500+ הודעות בחודש
- ✓ AI Menu Planner משמש 30%+ מההצעות
- ✓ Loyalty Program עם 100+ חברים

### Exit Criteria
- ROI מדיד מהקמפיינים
- WhatsApp opt-in rate > 60%
- AI accuracy > 80% (לקוח מאשר הצעה בלי שינוי משמעותי)

### לקוחות
- פתיחת self-service signup ללא הגבלה

---

## ⏱ Timeline ויזואלי

```
D-60 ───── D-46 ───── D-15 ───── D+15 ───── D+45 ───── D+75 ───── D+105
  │  Ph0   │  Ph1     │   Ph2    │   Ph3    │   Ph4    │   Ph5
  │ Fixes  │  Core    │ Finance  │ HR/BI    │ Mobile   │ Marketing+AI
  │ 2 wks  │  1 mo    │  1 mo    │  1 mo    │  1 mo    │  1+ mo
```

## 🎯 שגרת בקרה

- **Daily Standup** — צוות פיתוח, 15 דק'
- **Weekly Sync** — Launch Owner + Leads, 60 דק'
- **Bi-weekly Steering** — הנהלה + נציגי לקוח פיילוט, 90 דק'
- **Phase Gate Review** — לפני מעבר ל-Phase הבא, חתימה רשמית של כל ה-Leads

## 🚦 כללי Decision לעבור Phase

ניתן לעבור ל-Phase הבא רק אם:
1. כל Exit Criteria של Phase נוכחי הושגו ✓
2. אין באג Critical פתוח > 7 ימים
3. Launch Owner + Product + QA Lead מאשרים בכתב
4. עברו לפחות 7 ימי יציבות מאז התיקון האחרון

## 🔁 כללי Decision לחזור Phase

יש לחזור Phase אם:
- 2+ באגים Critical חדשים תוך 48h אחרי deploy
- Uptime נופל מתחת ל-95% במשך 24h
- לקוח פיילוט דורש pause בכתב
- אירוע אבטחה (Data leak / breach)

</div>
