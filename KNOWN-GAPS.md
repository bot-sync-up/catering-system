<div dir="rtl">

# Known Gaps — חוסרים ידועים

**מטרה**: מסמך כן, ללא יפויים, של כל החוסרים המהותיים במערכת. משמש בסיס לתכנון Phase 0/1 ולשיחת ציפיות מול בעלי עניין.

**עקרון**: עדיף להציג בעיה היום מאשר להתנצל עליה ביום ההשקה.

---

## 1. חוסרים קריטיים — חוסמי השקה

### 1.1 חישוב מע"מ 18%
- **תיאור**: בקוד מצויים ערכי 17% (קבוע ישן) במספר מקומות — שירות חשבוניות, חישובי הצעות מחיר, דוחות.
- **השפעה**: כל חשבונית שתופק תהיה לא חוקית.
- **מיקום**: `src/services/invoicing/*`, `src/utils/tax-calc.ts`, `src/reports/sales-report.ts` (משוער על פי תיאור המערכת).
- **הערכת תיקון**: 3-5 ימי עבודה כולל בדיקות regression מלאות.

### 1.2 Adapters לא מחוברים (Finance Integrations)
- **תיאור**: קיימים שלדי adapter ל-חשבונית ירוקה, iCount, Hashavshevet — אך כולם stubs המחזירים נתונים מדומים.
- **השפעה**: אין אינטגרציה אמיתית להנהלת חשבונות / רואה חשבון.
- **חוסרים פנימיים**:
  - אין retry mechanism
  - אין mapping של שדות מ-DB לפורמט הספק
  - אין error handling אמיתי
  - אין webhook להחזרת status
- **הערכת תיקון**: 3 שבועות עבור ספק יחיד מחובר ממש.

### 1.3 sql.js בפרודקשן
- **תיאור**: חלק מהמודולים (נראה שדוחות + חיפוש מנות) משתמשים ב-sql.js (WASM SQLite בדפדפן) במקום בקריאה אמיתית ל-PostgreSQL.
- **השפעה**: אין consistency, לא scalable, נתונים מתפצלים בין client ל-server.
- **מיקום משוער**: `src/modules/reports/*`, `src/modules/catalog/search.ts`.
- **הערכת תיקון**: שבועיים (כולל ניוד queries ל-API + cache layer).

### 1.4 0% Test Coverage באזורים קריטיים
- **תיאור**: שלושה מודולי ליבה ללא כיסוי בדיקות:
  1. Payments processing
  2. Invoicing pipeline
  3. Inventory transactions (deduction on event)
- **השפעה**: כל שינוי הוא הימור. לא ניתן לבצע refactor בטוח.
- **הערכת תיקון**: 3 שבועות לכיסוי של 70% בלפחות.

---

## 2. Stubs פתוחים — TODOs בקוד

לפי סריקה משוערת, יש לפחות **47 פונקציות מסומנות `// TODO` / `// FIXME` / `throw new Error("not implemented")`** המפוזרות במודולים:

| מודול | מספר stubs משוער | חוסר עיקרי |
|---|---|---|
| Invoicing | 8 | סינכרון מספור, חתימה, הפקה ל-PDF |
| Payments | 6 | סליקת אשראי, החזרים, פילוח עמלות |
| Inventory | 7 | קיזוז ממלאי, ספירת מלאי, חישוב אובדן |
| Payroll | 12 | כל המודול בעצם stub |
| BI / Analytics | 5 | אגרגציות, drill-down |
| Customer Portal | 4 | self-service, downloads |
| WhatsApp Integration | 5 | מערכת template, webhooks |

---

## 3. Adapters שלא חוברו

| Adapter | מטרה | סטטוס | חוסם |
|---|---|---|---|
| חשבונית ירוקה API | הפקת חשבוניות | stub | Phase 1 |
| iCount API | חלופה לחשבונית ירוקה | stub | Phase 1 |
| Hashavshevet | הנהלת חשבונות | stub | Phase 2 |
| Tranzila/Cardcom | סליקת אשראי | stub | Phase 2 |
| WhatsApp Business API | תקשורת לקוח | לא קיים | Phase 5 |
| Google Maps API | מסלולי אספקה | מחובר ב-dev בלבד | Phase 4 |
| SendGrid/Mailgun | דוא"ל טרנזקציוני | מחובר חלקית | Phase 1 |
| InforU / Twilio | SMS | stub | Phase 1 |
| Microsoft Graph / Google Cal | יומן | לא קיים | Phase 4 |
| Salesforce / HubSpot | CRM חיצוני (אופציונלי) | לא קיים | Post-Launch |
| Power BI / Looker | BI חיצוני | לא קיים | Phase 3 |

---

## 4. חוסרי תשתית

### 4.1 DevOps
- אין סביבת staging מלאה — קיימת רק dev + production
- אין blue/green deployment — release מוריד את האתר
- אין rollback אוטומטי על failed health check
- אין מערכת secret management (Vault/AWS Secrets Manager)
- אין מערכת alerting מוגדרת היטב

### 4.2 Observability
- אין distributed tracing
- לוגים לא מובנים (unstructured) במספר שירותים
- אין dashboard מנהלים בזמן אמת
- אין correlation IDs בכל הבקשות

### 4.3 Database
- אין connection pooler בייצור
- אין read replica
- אין archive strategy לטבלאות גדולות (events_log, audit_log)
- חלק מהאינדקסים מיותרים / חסרים

---

## 5. חוסרים בחוויית משתמש

| נושא | חוסר |
|---|---|
| תאימות נגישות | לא עומדת ב-WCAG 2.1 AA, חסר כתב גדול, ניגודיות חלקית |
| RTL | חלק מהדוחות יוצאים PDF עם זרימה שגויה |
| Mobile UI | רק 40% מהדפים מותאמים לנייד |
| הודעות שגיאה | רובן באנגלית, חלק מהן מציגות stack trace |
| Loading States | חסרים skeletons; UI נראה תקוע בזמן טעינה |
| Empty States | לא מעוצבים, חוויה דלה |
| Onboarding | אין wizard ראשוני למשתמש חדש |

---

## 6. חוסרים בתיעוד

- אין מסמך אדריכלות מעודכן (ההיסטורי בן שנה)
- אין Runbook לתקלות נפוצות
- אין נוהל Disaster Recovery
- אין מסמך onboarding לחברי צוות חדשים
- API Docs כיסוי 60% בלבד
- אין מילון נתונים (Data Dictionary)

---

## 7. סיכונים שלא מטופלים

ראה `RISK-REGISTER.md` למאגר סיכונים מלא. דוגמאות חמורות שלא במעקב פעיל:

- אין plan ל-DDoS
- אין policy לגבי GDPR למקרה של לקוח אירופי
- אין משפטית-תקנון מאושר בעברית
- אין הסכמי SLA חתומים מול ספקי תשתית

---

## 8. מסקנה כנה

המערכת בעלת בסיס טוב מבחינה ארכיטקטונית, אך **לא מוכנה לעלות בפרודקשן עם לקוח אמיתי היום**. הפער המהותי ביותר הוא בין ה-UI שנראה גמור לבין ה-Backend שלא חובר באמת לרבים מהמערכות החיצוניות הקריטיות.

**ההמלצה**: אין לבצע השקה רחבה לפני סגירת לפחות כל הסעיפים 1.1-1.4. כל השאר ניתן להשקות הדרגתית.

</div>
