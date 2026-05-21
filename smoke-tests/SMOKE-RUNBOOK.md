# מדריך הפעלה — Smoke Test Harness

> מטרה: לוודא ש**הכל עובד** לפני שדוחפים לשרת.
> שום deploy לא ייצא לפני שכל ה-smoke tests עברו.

---

## מהם Smoke Tests?

בדיקות **מהירות** ו**רחבות** שמוודאות שהמערכת **באוויר** ועובדת ברמה בסיסית:
- DB מתחבר, Redis מגיב
- שירותים מחזירים 200 על `/health`
- Seed נטען נכון
- Auth flow עובד מקצה לקצה
- אינטגרציות (CardCom, iCount) מגיבות ב-sandbox
- אין secrets שדלפו ל-repo

---

## מתי להריץ — מטריצה

| מצב | פקודה | משך | חובה? |
|-----|--------|-----|-------|
| **אחרי `git pull`** | `pnpm smoke:quick` | ~30 שניות | כן |
| **לפני `pnpm dev`** | `pnpm smoke:health` | ~10 שניות | מומלץ |
| **לפני כל deploy** | `pnpm smoke:full` | ~3 דקות | **חובה** |
| **אחרי כל patch / hotfix** | `pnpm smoke:full` | ~3 דקות | **חובה** |
| **אחרי שינוי ENV** | `pnpm smoke:security` + `pnpm smoke:health` | ~20 שניות | **חובה** |
| **אחרי שינוי schema/migration** | `pnpm smoke:db` | ~30 שניות | **חובה** |
| **אחרי שינוי integration code** | `pnpm smoke:integrations` | ~1 דקה | כן |
| **CI — אחרי merge ל-main** | אוטומטי דרך `.github/workflows/smoke.yml` | ~5 דקות | אוטומטי |
| **Nightly (3:00)** | אוטומטי דרך cron | ~10 דקות | אוטומטי |

---

## פקודות מפתח

```bash
# הכל בבת אחת — full suite (~3 דק')
bash smoke-tests/scripts/run-smoke.sh full

# מהיר — רק תשתית + DB + health (~30 שניות)
bash smoke-tests/scripts/run-smoke.sh quick

# רק בדיקות אבטחה
bash smoke-tests/scripts/run-smoke.sh security

# רק health endpoints
bash smoke-tests/scripts/run-smoke.sh health

# פתח את הדשבורד
start smoke-tests/dashboards/smoke-results.html   # Windows
open  smoke-tests/dashboards/smoke-results.html   # macOS
xdg-open smoke-tests/dashboards/smoke-results.html  # Linux
```

---

## פירוט קבוצות הבדיקה

### 1. Infrastructure (4 בדיקות)
- Docker daemon פעיל
- `docker-compose ps` מציג containers בריאים
- Postgres + Redis containers up

### 2. Database (3 בדיקות)
- חיבור ל-Postgres
- Extension `uuid-ossp` קיים
- `prisma migrate status` נקי

### 3. Cache & Queues (2 בדיקות)
- `redis-cli ping → PONG`
- set/get round-trip

### 4. Application Services (4 בדיקות)
- API `/health` מחזיר 200
- API health כולל DB status
- API health כולל Redis status
- Web app מגיב

### 5. Seed Data (3 בדיקות)
- Tenant `demo` קיים
- 50+ customers
- 30+ events

### 6. Integration Tests (vitest, 11 בדיקות)
| קובץ | מה הוא מוודא |
|------|--------------|
| `db-connection.test.ts` | Prisma connect, transactions, rollback |
| `redis-connection.test.ts` | ping, get/set, expire, incr |
| `seed-loaded.test.ts` | tenant=demo + 50 customers + 30 events |
| `auth-flow.test.ts` | register → login → JWT → refresh → logout |
| `rbac-enforcement.test.ts` | customer לא יכול לקרוא salary |
| `audit-recorded.test.ts` | יצירת customer → audit_log entry |
| `vat-18.test.ts` | invoice עם vatRate=18 (ישראל 2025+) |
| `cardcom-sandbox.test.ts` | tokenize → charge → refund |
| `icount-sandbox.test.ts` | createInvoice → allocation → archived |
| `event-bus.test.ts` | publish → subscribe → ack |
| `saga-cancel-event.test.ts` | SAGA מלא של ביטול אירוע |

### 7. Security (8 בדיקות)
- `JWT_SECRET` לא ברירת מחדל ולא קצר מ-32 תווים
- כל המשתנים הנדרשים מוגדרים ב-ENV
- אין `.env` ב-git
- אין secrets ידועים (AWS, GitHub PAT, RSA keys) בקוד
- HTTPS-only cookies בייצור
- CORS לא wildcard בייצור
- gitleaks scan (אם מותקן)

### 8. E2E Quick (Playwright, 2 בדיקות)
- `login.spec.ts` — admin login עובד
- `dashboard.spec.ts` — dashboard נטען בלי שגיאות

---

## פרשנות תוצאות

### `Pass: N, Fail: 0` 
**אתה רשאי לדחוף ל-staging/production.**

### `Pass: N, Fail: 1+`
**עצור. אל תדחוף.** קרא את הפלט, בדוק איזו בדיקה נכשלה, תקן, רוץ שוב.

### `SKIP`
בדיקה אופציונלית שלא רלוונטית בסביבה הזו (למשל gitleaks לא מותקן). לא חוסם.

---

## טיפול בכשלים נפוצים

| שגיאה | סיבה אפשרית | פתרון |
|--------|-------------|--------|
| `docker-compose ps` ריק | לא הפעלת compose | `docker-compose up -d` |
| `psql: connection refused` | Postgres לא רץ | `docker-compose up -d postgres` |
| `redis-cli: Could not connect` | Redis לא רץ | `docker-compose up -d redis` |
| `JWT_SECRET is set` נכשל | `.env` חסר או דיפולטיבי | החלף את `JWT_SECRET` לסטרינג רנדומלי של 64 תווים |
| `tenant 'demo' exists` נכשל | seed לא רץ | `pnpm db:seed` |
| `prisma migrate status` נכשל | migrations חדשים | `pnpm prisma migrate deploy` |
| `cardcom-sandbox` 401 | terminal/credentials שגויים | בדוק `CARDCOM_*` ב-ENV |

---

## אזהרות חשובות

1. **לעולם אל תריץ smoke עם credentials של production.** קיימת `cardcom-sandbox.test.ts` שמבצעת חיוב 1 ש"ח — נגד sandbox בלבד.
2. **אם הוספת אינטגרציה חדשה** — הוסף `*.test.ts` תואם תחת `tests/integration/` ועדכן את `run-smoke.sh`.
3. **CI יכשיל את ה-merge** אם smoke ייכשל ב-`.github/workflows/smoke.yml`.

---

## ענפי החלטה (Decision Tree)

```
האם עשיתי שינוי קוד?
├─ כן → smoke full
│   ├─ עבר → דחוף
│   └─ נכשל → תקן → smoke full
└─ לא (רק config/env) → smoke security + smoke health
    ├─ עבר → דחוף
    └─ נכשל → תקן → חזור
```

---

## תחזוקה

- **כל רבעון**: עדכן את הספים (`50+ customers`, `30+ events`) אם הסיד השתנה.
- **כל גרסה חדשה של Node/pnpm**: ודא ש-`run-smoke.sh` עדיין רץ.
- **אחרי שינוי בסכמה**: עדכן את שמות העמודות ב-`vat-18.test.ts` ו-`audit-recorded.test.ts`.
