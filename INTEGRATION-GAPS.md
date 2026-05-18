# INTEGRATION-GAPS — פערים לפני production

מסמך זה מרכז את החוסרים והנחות-העבודה שזוהו תוך כדי בניית `services/orchestrator/` ושני ה-E2E (`wedding-700`, `cancellation`). כל פער מסומן בעדיפות (גבוהה / בינונית / נמוכה) ובאחראי משוער.

---

## 1. תשתית והרצה

### 1.1 BullMQ — קונפיגורציה ללא ריצה (גבוהה)
- כרגע `src/lib/queue.ts` יוצר חיבור Redis רק כשמבקשים queue בפועל. ב-E2E ובמסלולי ה-API ה-saga רצה **inline** בתוך handler ה-Express (לא נכנסת ל-queue).
- חוסר: workers ל-3 ה-queues (`new-event-order`, `approve-and-bill`, `cancel-event`) + `QueueEvents` ל-observability.
- חוסר: idempotency-key לכל job (כרגע כל POST יוצר run חדש — אם הלקוח לוחץ פעמיים = כפילות).
- חוסר: dead-letter handling + retry policy ייעודי לכל ענף downstream (Cardcom ↔ iCount).

### 1.2 State store בזיכרון בלבד (גבוהה)
- `src/lib/state.ts` מחזיק `Map` in-memory. ריסטארט = איבוד היסטוריה.
- צריך לעבור ל-Postgres (`orchestrator_runs`, `orchestrator_steps`) או לפחות Redis Hashes עם TTL של 30 יום.
- חסר migration script, חסר אינדקסים על `(type, status, startedAt)`.

### 1.3 Health/Readiness/Metrics (בינונית)
- יש `/health` בסיסי בלבד.
- חסר `/ready` שמוודא חיבור Redis + DB.
- חסר `/metrics` ב-Prometheus format (saga_duration_seconds, step_failures_total, compensation_total).

---

## 2. אינטגרציות חיצוניות

### 2.1 Cardcom (גבוהה)
- ה-client נכתב מול endpoint שטוח (`/Interface/ChargeToken.aspx`) — בפועל ל-Cardcom יש פלואים שונים: Low-Profile, Direct, JWT, Token-Refund.
- חסר תמיכה ב-`tokenizeOnly` (שמירת כרטיס לאירוע ללא חיוב).
- חסר webhook listener ל-`PaymentResultPage` (כיום אנו מסתמכים על תגובה סינכרונית — Cardcom לעיתים מחזירה async).
- חסר טיפול ב-`DealResponse=33` (3DS challenge) שמחייב redirect של המשתמש.

### 2.2 iCount (גבוהה)
- `createInvoice` ו-`allocatePayment` מסומלצים. ה-API האמיתי של iCount דורש `cid`, `user`, `pass` (לא Bearer).
- חסר טיפול ב-VAT exemptions (חברה פטורה, עוסק פטור).
- חסר מיפוי `client_id` של iCount מול `customerId` של ה-CRM (כיום אותה מחרוזת — לא נכון).
- חסר retry על שגיאת 429 / connection-reset של iCount (קורה לעיתים תכופות בערב חמישי).
- credit-note: ב-iCount הזיכוי לא "מבטל" חשבונית אלא יוצר מסמך נפרד — חובה לעדכן את תצוגת הדוחות בהתאם.

### 2.3 CRM (גבוהה)
- אין CRM אמיתי מאחורי `crmClient` — רק stubs. צריך להחליט: Botboss? HubSpot? בית?
- חסר event-driven sync (כשמשנים סטטוס הזמנה ב-CRM — לעדכן את ה-run records).

### 2.4 Inventory / Kitchen / Staff / Delivery (בינונית)
- כל ה-clients הללו stubs מלאים. אין מערכת אחורית מוגדרת.
- אם יבחרו ב-spreadsheet/Airtable בינתיים — צריך adapter עם rate-limiting.
- Delivery: חסר חישוב מסלול אמיתי (Google Routes / Waze SDK).
- Staff: חסר שילוב עם רגולציה (שעות עבודה מקסימליות, הפסקות חובה).

### 2.5 Notifications (בינונית)
- channel=email/sms/whatsapp — ב-mock רק חוזר "sent".
- חסר provider ספציפי: SendGrid? Twilio? Greenapi לוואטסאפ עברית?
- חסר template engine (כיום שולחים template-name גולמי).

### 2.6 BI (נמוכה)
- אירועי BI נשלחים על "אש ושכח". חסר schema-registry ו-fan-out ל-DWH.

---

## 3. SAGA / Compensation

### 3.1 Forward-only recovery (בינונית)
- `runSaga` מבצע rollback רק כשיש כשל. אין אפשרות "המשך מהשלב שנכשל" אחרי תיקון ידני.
- חוסר: persistence של ה-context בין שלבים כדי לאפשר resume.

### 3.2 Compensation idempotency (גבוהה)
- אם compensation נכשלת (למשל Cardcom refund נדחה) — היא נרשמת אבל לא נדחפת ל-queue לטיפול ידני.
- צריך לייצר `compensation-pending` queue + dashboard למפעיל.

### 3.3 חוסר תזמון מבוסס-זמן (נמוכה)
- אירועים עתידיים (תזכורת 48 שעות לפני, follow-up אחרי) דורשים cron — לא קיים.

---

## 4. אבטחה ואותנטיקציה

- אין auth ב-`/api/orchestrate/*` — חייב לפני production. JWT/API-Key + RBAC (operator/manager/admin).
- אין rate-limiting (`express-rate-limit`).
- אין audit log חיצוני (כיום רק pino → stdout).
- secrets ב-`.env` — להעביר ל-Vault/AWS Secrets Manager.

---

## 5. תיעוד וטיפוסים

- חסר OpenAPI/Swagger ל-3 ה-endpoints.
- חסר חוזה (`@syncup/contracts`) משותף עם ה-CRM/Frontend — כרגע ה-zod schemas יושבים רק בשירות התזמור.

---

## 6. בדיקות

- E2E עוברים מול mocks בלבד. חסר:
  - contract tests (Pact) מול Cardcom sandbox + iCount sandbox.
  - load test (k6) לחתונה של 700 מקבילית.
  - chaos: kill את Redis באמצע saga ולוודא resume.

---

## 7. תפעול

- אין Dockerfile/Compose ב-worktree (יושב בפרויקט-אם של syncup).
- חסר liveness probe ל-k8s.
- חסר alerting (Sentry/Slack) על `saga.failed`.

---

**סיכום**: השירות מציע מבנה saga עם compensation מלא, validation עם zod, וניתוק נקי בין clients ל-workflows כך שהמעבר מ-mocks ל-providers אמיתיים = החלפת מימוש בלבד. הפערים הקריטיים לפני production הם persistence (state + DLQ), אינטגרציות אמיתיות של Cardcom/iCount, ו-auth.
