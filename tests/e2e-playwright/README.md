# Playwright E2E — חבילת בדיקות

חבילת בדיקות end-to-end מקיפה לפלטפורמת ה-CRM/ERP, עם תמיכה מלאה ב-RTL ועברית.

## דרישות מקדימות

- Node.js 20+
- Postgres 16 (לוקאלי, או דרך Docker)
- Redis 7 (לוקאלי, או דרך Docker)
- הסביבה צריכה להריץ את השרת הראשי (`BASE_URL_WEB`) ואת פורטל הלקוחות (`BASE_URL_PORTAL`).

## התקנה

```bash
cd tests/e2e-playwright
npm install
npx playwright install --with-deps chromium
```

## הגדרת סביבה

הקובץ `.env.test` כולל את כל הפרמטרים. ניתן לדרוס עם משתני סביבה:

```bash
export BASE_URL_WEB=http://localhost:3000
export BASE_URL_PORTAL=http://localhost:3001
export DATABASE_URL=postgres://test_user:test_pass@localhost:5432/test_db
```

## הרצה

### Headless (ברירת מחדל)
```bash
npm test
```

### Headed (עם דפדפן גלוי)
```bash
npm run test:headed
```

### UI mode (אינטראקטיבי)
```bash
npm run test:ui
```

### לפי פרויקט
```bash
npm run test:web       # דסקטופ - אזור אדמין/CRM
npm run test:mobile    # מובייל - chromium mobile
npm run test:portal    # פורטל לקוחות
```

### דיבוג בדיקה ספציפית
```bash
PWDEBUG=1 npx playwright test specs/wedding-700.spec.ts
```

### צפייה בדוח אחרי הרצה
```bash
npm run test:report
```

## מבנה התיקיות

```
tests/e2e-playwright/
├── playwright.config.ts       # 3 פרויקטים: web / mobile / portal
├── setup.ts                   # global setup: seed + login
├── teardown.ts                # global teardown: cleanup
├── .env.test                  # קונפיגורציית סביבה
├── specs/                     # 10 חבילות בדיקה
│   ├── wedding-700.spec.ts
│   ├── subscription-school.spec.ts
│   ├── cancellation-flow.spec.ts
│   ├── customer-portal.spec.ts
│   ├── ocr-invoice.spec.ts
│   ├── payroll.spec.ts
│   ├── admin-rbac.spec.ts
│   ├── audit-log.spec.ts
│   ├── 2fa-admin.spec.ts
│   └── event-management.spec.ts
├── pages/                     # Page Objects (RTL-aware)
│   ├── BasePage.ts
│   ├── LoginPage.ts
│   ├── CrmPage.ts
│   ├── OrdersPage.ts
│   ├── PortalPage.ts
│   ├── InvoicePage.ts
│   └── KitchenPage.ts
├── fixtures/                  # נתוני בדיקה
│   ├── users.json
│   ├── menus.json
│   ├── events.json
│   └── seed.sql
└── utils/                     # עזרי בדיקה
    ├── helpers.ts
    └── totp.ts                # 2FA / TOTP RFC 6238
```

## חבילות הבדיקה

| # | Spec | תיאור |
|---|------|--------|
| 1 | `wedding-700.spec.ts` | מסלול חתונה מלא: לקוח חדש → אירוע 700 איש → תפריט פרימיום → מקדמה → ביצוע → חשבונית מס → תשלום סופי → דיבריף |
| 2 | `subscription-school.spec.ts` | מנוי חודשי לבית ספר עם חיוב מחזורי |
| 3 | `cancellation-flow.spec.ts` | ביטול הזמנה + החזר + אימות זיכוי + audit |
| 4 | `customer-portal.spec.ts` | פורטל לקוחות: התחברות, הזמנות, יצירה ותשלום אונליין |
| 5 | `ocr-invoice.spec.ts` | מטבח: העלאת חשבונית ספק, OCR, אימות, אישור, מלאי |
| 6 | `payroll.spec.ts` | clock-in/out, חישוב שעות והפרשות, תלוש PDF, טופס 106 |
| 7 | `admin-rbac.spec.ts` | בקרת הרשאות: לקוח לא רואה שכר, סוכן רואה רק לידים שלו |
| 8 | `audit-log.spec.ts` | רישום שינויים, אי-אפשרות מחיקה, רישום כשלי התחברות |
| 9 | `2fa-admin.spec.ts` | כפיית 2FA לאדמין: ללא קוד, קוד שגוי, קוד תקין |
| 10 | `event-management.spec.ts` | ניהול אירוע: Gantt, שיבוץ ציוד, לוחות זמני צוות |

## CI

הריצה האוטומטית מוגדרת ב-`.github/workflows/playwright.yml` ומריצה את כל הפרויקטים במקביל (matrix) עם services של postgres ו-redis. ארטיפקטים (HTML report, JUnit, traces) נשמרים ל-14 יום.

## תוספת בדיקות חדשות

1. הוסף קובץ `*.spec.ts` תחת `specs/`.
2. השתמש ב-Page Objects הקיימים (יבוא מ-`@pages` או נתיב יחסי).
3. עדכן fixtures אם נדרשים נתונים חדשים.
4. תייג נתוני בדיקה ב-DB עם `metadata.e2e = true` כדי שיימחקו ב-teardown.

## בעיות נפוצות

**`global setup failed: ECONNREFUSED`** — ודא ש-postgres/redis פעילים, וש-`BASE_URL_WEB` עונה.

**`storageState file not found`** — מחק את `.auth/` והרץ שוב; ה-setup יבצע לוגין מחדש.

**RTL locators לא נמצאים** — ה-Page Objects משתמשים ב-`getByLabel` / `getByRole` עם regex לעברית. ודא שה-UI מספק `aria-label` או `<label>` קישוריים.
