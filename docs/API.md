# API — Expenses & Budget

Base URL: `/api`
Auth: כל ה-routes (פרט ל-`/auth`) דורשים `Authorization: Bearer <token>`.

## Auth
- `POST /auth/register` — `{ email, password, name, role? }`
- `POST /auth/login` — `{ email, password }` → `{ token, user }`

## CoA — תוכנית חשבונות
- `GET /coa` — עץ הירארכי
- `GET /coa/flat` — רשימה שטוחה
- `POST /coa` — `{ code, nameHe, type, parentId?, level? }`
- `PUT /coa/:id`
- `DELETE /coa/:id` (יכשל אם בשימוש)

## Expenses
- `GET /expenses` — סינון: `from, to, coaId, vendorId, status, source`
- `GET /expenses/summary?year=YYYY` — סיכום חודשי + לפי חשבון
- `POST /expenses` — multipart, שדה `payload` JSON + `invoice` קובץ
- `PUT /expenses/:id`
- `DELETE /expenses/:id`
- `GET /expenses/vendors/list`
- `POST /expenses/vendors`

## Recurring (קבועות)
- `GET /recurring`
- `POST /recurring` — `{ name, category, amount, frequency, dayOfMonth, startDate, coaId, ... }`
- `PUT /recurring/:id`
- `DELETE /recurring/:id`
- `POST /recurring/generate` — `{ year, month }` יצירה ידנית

יצירה אוטומטית: BullMQ (אם Redis זמין) / node-cron — ב-1 לחודש בשעה 02:00.

## Budget
- `GET /budget?year=YYYY`
- `POST /budget` — `{ year, month?, coaId, amount }` (upsert)
- `PUT /budget/:id`
- `DELETE /budget/:id`
- `GET /budget/vs-actual?year=YYYY&month=MM` — Budget vs Actual
- `POST /budget/check-variance` — בדיקה ידנית
- `GET /budget/alerts?year=YYYY&acknowledged=false`
- `PUT /budget/alerts/:id/ack`

חישוב חריגה אוטומטי בכל יצירת הוצאה. ספים: 10% INFO, 15% WARNING, 30% CRITICAL.

## Petty Cash
- `GET /petty`
- `POST /petty` — `{ name, initialBalance }`
- `GET /petty/:id/entries`
- `POST /petty/:id/entries` — multipart, payload + receipt. אם OUT עם coaId — נוצרת גם הוצאה.

## Bank
- `GET /bank/accounts` / `POST /bank/accounts`
- `GET /bank/statements`
- `POST /bank/statements/upload` — multipart: `file`, `bankAccountId`. תומך OFX, CSV, XLSX. מבצע התאמה אוטומטית.
- `GET /bank/statements/:id/transactions`
- `POST /bank/transactions/:id/match` — `{ expenseId }`
- `POST /bank/transactions/:id/unmatch`
- `GET /bank/unmatched`

## Reimbursement (החזרים)
- `POST /reimbursement` — multipart payload + receipt
- `GET /reimbursement`
- `GET /reimbursement/:id`
- `POST /reimbursement/:id/approve` — Manager/Admin/Accountant
- `POST /reimbursement/:id/reject` — `{ reason }`
- `POST /reimbursement/:id/pay` — Admin/Accountant. רושם הוצאה אוטומטית.

Workflow: PENDING → APPROVED → PAID (או REJECTED).

## OCR
- `POST /ocr/parse` — multipart `file`. מחזיר `{ raw, fields }`.
  שדות מחולצים: `totalAmount, vatAmount, invoiceNumber, taxId, date, vendorGuess`.

## הגדרות סביבה (.env)
- `DATABASE_URL` — PostgreSQL
- `REDIS_HOST`, `REDIS_PORT` — Redis ל-BullMQ (אופציונלי)
- `JWT_SECRET`
- `VARIANCE_THRESHOLD_PERCENT` — ברירת מחדל 10
- `UPLOAD_DIR` — תיקיית uploads
