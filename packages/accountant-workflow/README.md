<div dir="rtl">

# @syncup/accountant-workflow

חבילת **"רואה חשבון מדווח"** — מערכת המייצרת אוטומטית את כל קבצי הדיווח החודשיים/שנתיים לרשויות המס,
אך **אינה מגישה אותם בעצמה**. הרו"ח של העסק מקבל התראה, נכנס לפורטל, מוריד, מגיש ידנית באתר שע"מ
ומסמן בפורטל "הוגש" עם מספר אסמכתא.

## למה מצב manual?

קייטרינג ממוצע אינו מעוניין שהמערכת תיגע במע"מ/מס הכנסה. הרו"ח כבר עובד עם הלקוח שנים, חתום על
ייפוי כוח, ורוצה שליטה מלאה על המועד והערכים המוגשים. החבילה הזו ממכנת את ה**הכנה** (95% מהעבודה
החודשית) ומשאירה את **ההגשה** בידיו.

## תכונות

| תחום | מה נכלל |
|------|---------|
| מחוללי קבצים | PCN874 (XML+Mai101), 856 (חלק א'+ב'), 102, 126, רווח/הפסד, מאזן, יומן הח"ש |
| תזמון BullMQ | 10 לחודש 09:00 חודשי / 31.3 שנתי / ראשון 09:00 סיכום שבועי |
| פורטל React | Dashboard, רשימת קבצים, יומן הגשות, היסטוריה |
| התראות | Email בהיווצרות, WhatsApp 48ש' לפני deadline, SMS ביום ההגשה |
| יומן ביקורת | יצירה / הורדה / סימון הוגש / אישור — שמירת 7 שנים |
| RBAC | accountant / general-manager / staff |
| ארכיון | 7 שנים בהתאם לתקנות ניהול ספרים |

## התקנה

```bash
pnpm add @syncup/accountant-workflow
```

## תצורה (ENV)

```env
TAX_REPORTING_MODE=manual            # auto | manual | hybrid
ACCOUNTANT_EMAIL=cpa@example.co.il
ACCOUNTANT_PHONE=+972501234567
ACCOUNTANT_NOTIFY_DAY_OF_MONTH=10
ACCOUNTANT_FILES_BASE_PATH=/var/accountant-files
ACCOUNTANT_ARCHIVE_YEARS=7
ACCOUNTANT_TZ=Asia/Jerusalem
```

## שימוש מהיר

```ts
import {
  AccountantWorkflow,
  AccountantNotifier,
  SubmissionAuditLog,
  loadAccountantConfig,
} from '@syncup/accountant-workflow';

const wf = new AccountantWorkflow({
  config: loadAccountantConfig(process.env),
  business: {
    taxId: '514321987',
    vatNumber: '514321987',
    legalName: 'הקייטרינג שלי בע"מ',
    reportingYear: 2026,
  },
  notifier: new AccountantNotifier({
    email: emailProvider,
    sms: smsProvider,
    whatsapp: whatsappProvider,
    contact: { email: process.env.ACCOUNTANT_EMAIL, phone: process.env.ACCOUNTANT_PHONE },
  }),
  audit: new SubmissionAuditLog(yourPostgresAuditStore),
  repository: yourPostgresFilesRepository,
});

await wf.runMonthly({ period: '2026-04', year: 2026, month: 4 }, await loadAprilData());
```

## מסמכים נוספים

- [`docs/ACCOUNTANT-GUIDE.md`](./docs/ACCOUNTANT-GUIDE.md) — מדריך לרו"ח
- [`docs/TAX-CALENDAR-2026.md`](./docs/TAX-CALENDAR-2026.md) — לוח שנה שנתי
- [`docs/SHAAM-SUBMISSION-STEP-BY-STEP.md`](./docs/SHAAM-SUBMISSION-STEP-BY-STEP.md) — איך מגישים בפועל
- [`docs/AUTO-VS-MANUAL-MODE.md`](./docs/AUTO-VS-MANUAL-MODE.md) — מתי בוחרים כל מצב
- [`docs/MIGRATION-FROM-AUTO.md`](./docs/MIGRATION-FROM-AUTO.md) — מעבר ממצב auto

## בדיקות

```bash
pnpm --filter @syncup/accountant-workflow test
```

הבדיקות משתמשות ב-`InMemoryFs` ו-Mocked Notifications, כולל snapshot tests לפורמט Mai101.

</div>
