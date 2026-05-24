<div dir="rtl">

# דוח QA — בדיקת End-to-End Business Flows למערכת קייטרינג

**תאריך**: 2026-05-11
**סוכן**: QA E2E
**היקף**: 17 worktrees (modules 05–24) — בדיקת קישוריות וזרימה עסקית מקצה לקצה.

---

## תקציר מנהלים

לכל מודול בנפרד יש איכות סבירה: סכמות Prisma/SQL מקיפות, REST/tRPC routers ברורים, ולוגיקה עסקית מקומית עובדת.
**הבעיה המרכזית: כל worktree הוא "אי מבודד"**. אין שכבת אינטגרציה אחת, אין event bus משותף, אין contracts package שמשותף בין ה-modules, ואין service-to-service hooks. כל מודול הניח שמודולים אחרים יספקו לו webhook/HTTP endpoint — אך בפועל אף אחד לא חיווט אותם זה לזה.

**שורה תחתונה**: אף תרחיש מ-5 התרחישים לא מסוגל להשלים זרימה מקצה לקצה במצב הנוכחי ללא בניית שכבת תזמור (orchestration layer).

---

## תרחיש 1: חתונה גדולה (700 סועדים) — Lead → Profit

זרימה: אתר (24) → CRM (05) → הצ"מ (17) → אישור פורטל (07) → הזמנה (06) → תפריט (08) → מתכונים (09) → מלאי+רכש (10,11) → אירוע Gantt (13) → שיבוץ (15) → משלוח (14) → חשבונית (17) → iCount (18) → תשלום Cardcom (19) → שכר (16) → רווחיות (22).

### שלב-אחר-שלב

| # | שלב | סטטוס | פרטים |
|---|-----|------|-------|
| 1 | אתר ציבורי `POST /api/contact` | OK | `apps/public-site/src/app/api/contact/route.ts` — Zod, honeypot, rate-limit 15 שניות, שולח ל-`CRM_WEBHOOK_URL`. |
| 2 | CRM lead capture `POST /api/leads/capture` | OK חלקי | `src/app/api/leads/capture/route.ts` קולט UTM+source. אבל **חוזה ה-payload שונה**: אתר שולח `{name, email, phone, service, eventDate, message}`; CRM מצפה ל-`{title, contact:{...}, value, pipelineId, stageId}`. **חסר מתאם** — חייב transformer. |
| 3 | הצעת מחיר ב-17 | חסר חיבור | יש `POST /api/documents` עם `type=QUOTE`, אבל אין הפעלה אוטומטית מ-CRM lead (אין hook). חייבים `crm.lead.WON → invoice.createQuote`. |
| 4 | פורטל לקוח (07) מציג הצ"מ ומאשר | שבור | פורטל יודע על `Order` משלו (in-memory `db().orders`), **לא משולב כלל** עם schema מ-17 (Document) או 06 (Order). אין endpoint `GET /api/documents/:id` בפורטל שמושך מ-17. |
| 5 | יצירת הזמנה (06) | OK פנימי, מנותק | `orderRouter.create` יוצר Customer+Order מקומי. אין trigger מ-`Quote.accepted` (17) לכאן. |
| 6 | בחירת תפריט (08) | OK פנימי, מנותק | 08 הוא מערכת תפריטים עצמאית עם Order משלה ושל customers משלה. **כפילות סכמה**: גם 06, גם 08 וגם 17 מגדירים `Customer`/`Order` בנפרד עם UUID/IDs שונים. |
| 7 | תכנון הכנה (09) | OK מקומי | `POST /api/prep {action:"plan", eventId}`. אבל `eventId` שלו לא קשור ל-`eventId` של 13 — סכמות נפרדות. |
| 8 | חישוב מלאי דרוש (10) | חסר חיבור | יש BOM ב-10 (`Product.kind=dish` + BOM של raw materials). אין endpoint `POST /api/inventory/plan?orderId=X` שיחזיר חוסרים. ה-Order ב-06 פשוט לא יודע שיש BOM. |
| 9 | יצירת PO לספקים (11) | OK פנימי | יש `POST /api/purchase-orders`. **חסר auto-PO** — אין trigger ש"חסר X ק"ג עוף → צור PO לספק עם min price". |
| 10 | אירוע Gantt + משימות (13) | OK מקומי | `POST /api/events` יוצר event + tasks. **אין קישור ל-Order 06 או Event 09**. שלוש מערכות עם "event" נפרד. |
| 11 | שיבוץ עובדים (15) | OK מקומי | `POST /api/shifts` עם `requireRole`. **אין endpoint** `POST /api/shifts/from-event` שמייבא דרישות כוח אדם מאירוע 13. |
| 12 | משלוח (14) | OK מקומי | `POST /api/deliveries`. **אין קישור ל-Order**: ב-`Delivery` יש `customer_name` כ-string (לא `orderId`/`customerId`). |
| 13 | חשבונית מס סופית (17) | OK פנימי | `POST /api/documents type=TAX_INVOICE` עובד. **לא נוצרת אוטומטית** ב-`order.completed`. |
| 14 | sync iCount (18) | OK פנימי | `ICountAdapter.createInvoice` — מקבל `InvoiceInput`. **חסר adapter mapping** מ-`Document` של 17 ל-`InvoiceInput` של 18. |
| 15 | תשלום Cardcom (19) | OK פנימי | `CardComClient.charge`, `splitCharge`, `buildMilestonePlan`. הפורטל (07) יש לו `app/api/checkout/cardcom/route.ts` אבל מצפה לסכם מ-`Order` פנימי משלו, לא מ-Document. |
| 16 | קישור Payment → Document | שבור | 17 מצפה ל-`POST /api/documents/:id/payments`, 19 webhook מעדכן `IntegrationLog` בלבד. **אין webhook handler** ש-`charge.success → POST /api/documents/{docId}/payments`. |
| 17 | שכר עובדים (16) | OK מקומי | יש `POST /api/payroll/calculate` עם `workDays, sickDays, miluim`. **חסר import** מ-15 (HR `Attendance.hours`). |
| 18 | דוח רווחיות (22) | OK schema, נתונים חסרים | סכמה כוללת `Invoice, Payment, Expense, Event, LaborEntry, StockMovement, OverheadAllocation`. **בלי ETL מודולים אחרים**, ה-DB ריקה. |

### מה שבור (תרחיש 1)

- **כפילות `Customer`**: ב-05 (CRM), 06 (Orders), 08 (Menus), 11 (Suppliers), 15 (HR — `Employee` עם customer-link עקיף), 17 (Invoices), 22 (BI). כל אחד עם schema/IDs נפרד.
- **כפילות `Order`**: ב-06, 07 (Portal), 08 (Menus), 17 (sales order).
- **כפילות `Event`**: ב-09 (PrepTask.eventId), 13 (events table), 22 (BI Event).
- **`Invoice`**: ב-06 (`Invoice` model basic), 17 (`Document` המלא), 18 (iCount), 22 (BI). אין מקור-אמת.
- אין event bus / NATS / Redis pub-sub חוצה-מודולים.
- 06 מנפיק `kitchen.tasks.create` כ-side-effect אבל `applyEffects` כותב ל-DB מקומי של 06, לא ל-13.
- 06 מנפיק `delivery.create` — כותב ל-`prisma.delivery` מקומי של 06, לא ל-DB של 14.
- 06 שולח `notification.send` רק `console.info` — לא משולב עם WhatsApp / SMTP אמיתי.

### מה צריך לבנות

- **Domain Events Bus** (Redis Streams / NATS / BullMQ topic) — כל מודול publish + subscribe.
- **Contracts Package** משותף (`@catering/contracts`) עם `CustomerId`, `OrderId`, `EventId`, `DocumentId` כ-strong types.
- **CRM → 17 hook**: `Lead.WON → POST /docs/quote`.
- **17 → 07 hook**: `Quote.SENT → portal notification + signing link`.
- **07 → 06 hook**: `Quote.ACCEPTED → create Order in 06`.
- **06 → 09 hook**: `Order.APPROVED → prep plan request`.
- **09 → 10 hook**: `prep.plan.created → inventory.demand`.
- **10 → 11 hook**: `inventory.shortage → auto-PO draft`.
- **06 → 13 hook**: `Order.APPROVED & type=ONE_TIME_EVENT → create Event + Gantt template`.
- **13 → 15 hook**: `Event.staff_required → shift request`.
- **06 → 14 hook**: `Order.PREPARING → create Delivery`.
- **17 → 18 adapter**: `Document.issued → ICountAdapter.createInvoice(map(doc))`.
- **19 → 17 hook**: `charge.success webhook → POST /docs/:id/payments`.
- **15 → 16 hook**: `Shift.clocked-out → Payroll.appendHours`.
- **ETL job**: שעת cron שמושך מ-17, 18, 10, 06, 15 ל-22 BI.

---

## תרחיש 2: מנוי בית-ספר חודשי

זרימה: חוזה לקוח → הזמנת מנוי → יצירה אוטומטית של הזמנות יומיות → משלוחים חוזרים → חיובים מחזוריים (Cardcom recurring) → חשבונית חודשית.

### שלב-אחר-שלב

| # | שלב | סטטוס |
|---|-----|------|
| 1 | חוזה לקוח | חלקי | 24 יש לו `/contracts` (PDF) ב-`packages/contracts`, אבל לא מקושר ל-CRM/17. אין שדה `contractId` ב-Customer של 17. |
| 2 | הגדרת מנוי | חלקי | 06 יש לו `Subscription` model + `OrderType.MONTHLY_SUBSCRIPTION`. **אבל אין scheduler** שמייצר Order יומי אוטומטית. |
| 3 | יצירת הזמנות יומיות | שבור | אין `cron`/`BullMQ scheduler` ב-06 שיורה `subscription.tick → createOrder`. ה-`queues.ts` של CRM קיים אבל לא מטפל ב-subscriptions. |
| 4 | משלוחים חוזרים (14) | חלקי | יש endpoints, אבל לא קשור ל-`Subscription`. |
| 5 | חיוב חוזר (Cardcom recurring) | OK חלקי | יש `recurring.charged` ב-webhook handler של 19, וגם `RecurringId` ב-types. **אין `setupRecurring(token, plan)` API מקושר ל-Subscription**. |
| 6 | חשבונית חודשית (17→18) | חסר | אין `monthly-aggregation-invoice` ב-17 שמסכם כל ההזמנות של החודש לחשבונית אחת. |

### מה שבור

- אין שירות `subscription-orchestrator`.
- ב-19 `flows/wallets.ts` ו-`flows/milestones.ts` יש — אבל **אין `flows/recurring.ts`** שיוצר אסימון לחיוב חודשי.
- 22 BI יש `retention.ts` — אבל ההגדרה של "מנוי פעיל" לא מקושרת ל-06.

### מה צריך לבנות

- `subscription.scheduler` (BullMQ repeatable jobs) ב-06.
- `Cardcom.RecurringFlow` API: `createRecurring(token, monthlyAmount, dayOfMonth)`.
- aggregator ב-17: `POST /documents/aggregate?subscriptionId=X&period=YYYY-MM`.
- חוזה דיגיטלי (`@catering/contracts`) שמייצר `subscriptionId` ומחזיר ל-CRM+17.

---

## תרחיש 3: ביטול אירוע (14 ימים לפני)

זרימה: ביטול → policy % → החזר → ביטול PO → שחרור עובדים → זיכוי → החזר תשלום → עדכון BI.

### שלב-אחר-שלב

| # | שלב | סטטוס |
|---|-----|------|
| 1 | חישוב % לפי policy | OK | 06 יש `cancellation/policy.ts` (`quoteRefund`) ו-`refunds.ts` (`buildRefundPlan`). |
| 2 | ביטול הזמנה | OK | `orderRouter` + `transitionSchema` תומך ב-`CANCEL` + reason. ה-engine מפיק `cancelled` event. |
| 3 | ביטול PO לספקים | שבור | hook `order.cancelled` ב-06 שולח רק `notification` ו-`waitlist.try_promote`. **אין `po.cancel` side-effect**. 11 יש לו status `cancelled` ב-PO אבל לא נקרא מבחוץ. |
| 4 | שחרור עובדים | שבור | אין hook `event.cancelled → shifts.unassign`. ב-15, אין endpoint `DELETE /shifts/by-event/:eventId`. |
| 5 | זיכוי בחשבונית (17) | OK פנימי | יש `CREDIT_NOTE` ב-DocType. **לא מופעל אוטומטית** מ-cancellation. |
| 6 | החזר תשלום (19) | OK פנימי | יש `refund.completed` ב-webhook + handler. אין `POST /api/refund` שמופעל מ-`order.cancelled`. |
| 7 | עדכון BI | חלקי | יש `MovementType.RETURN` ב-22 inventory. אבל אין ETL שמכניס את ה-refund. |

### מה שבור

- `defaultHooks.ts` ב-06 לא יודע על PO/shifts/credit-notes — לא נכתבו hooks ל-side-effects חיצוניים.
- אין `reverse-effects` framework (compensating transactions).

### מה צריך לבנות

- `hookRegistry.on('*', 'cancelled', emit po.cancel + shifts.release + credit.create + refund.charge)`.
- בכל מודול: REST endpoint שמקבל cancellation event.
- שלד SAGA pattern ב-orchestrator.

---

## תרחיש 4: OCR חשבונית ספק

זרימה: IMAP → OCR Claude → ספק חדש? → התאמה PO → עדכון מחירים → עדכון מלאי → iCount → תזכורת.

### שלב-אחר-שלב

| # | שלב | סטטוס | פרטים |
|---|-----|------|-------|
| 1 | IMAP poll | OK | `imapFromEnv()` ב-`apps/api/src/server.ts` קורא כל 120 שניות. |
| 2 | Channels (mobile/PDF/batch) | OK | `/api/ingest/mobile`, `/browser-pdf`, `/batch`. |
| 3 | Queue + dedup SHA256 | OK | BullMQ + Redis. |
| 4 | Claude Vision parse | OK | `claude-opus-4-7` + prompt caching + few-shot per supplier. |
| 5 | Zod schema validate | OK | `InvoiceSchema`. |
| 6 | Supplier resolve | OK חלקי | `byTaxId, fallback name`. **אבל זה מ-DB מקומי של 12, לא מ-11**. |
| 7 | PO match | OK חלקי | מ-DB של 12 בלבד. **אין fetch** מ-11 `GET /api/purchase-orders`. |
| 8 | Item match | חלקי | matching נגד `Product` של 12 — לא נגד 10. |
| 9 | Alerts | OK פנימי | duplicate / ±30% / mismatch. |
| 10 | Auto-approve | OK פנימי | high confidence path. |
| 11 | Inventory adjust | שבור | קוד יש (`pipeline.ts`) — אבל כותב ל-DB של 12, **לא ל-10**. אין `POST /api/inventory/adjust` נקרא. |
| 12 | iCount purchase invoice | OK חלקי | `icount/client.ts` ב-12 שונה (axios+POST form) מ-`packages/integrations/icount` של 18 (RestClient with allocationNumber). **שני אינטגרציות iCount בנפרד**. |
| 13 | Verify UI | OK | `web-verify` React, RTL. |
| 14 | תזכורת תשלום | חסר | אין integration ל-17 (reminders.ts יש שם — אבל לא מקבל מ-12). |

### מה שבור

- 12 OCR יושב על schema משלו (Supplier/Product/PO) — מנותק מ-10/11.
- שתי גרסאות iCount בקוד (12 minimal, 18 complete).
- alerts מודפסים ב-console — אין channel ל-CRM/notifications.

### מה צריך לבנות

- `OcrInvoice.approved → 11 POST /api/purchase-orders/:id/grn` (קליטת סחורה).
- `OcrInvoice.approved → 10 POST /api/inventory/movements` (תנועת מלאי).
- `OcrInvoice.approved → 17 POST /api/documents` (purchase invoice).
- `OcrInvoice.approved → 17 POST /api/payments/schedule` (reminder).
- מיזוג שני adapters של iCount ל-package אחד.

---

## תרחיש 5: שכר חודשי

זרימה: clock in/out (15) → calc שכר+הפרשות (16) → תלוש PDF → 102/126 → חיוב בנק → רישום הוצאה.

### שלב-אחר-שלב

| # | שלב | סטטוס |
|---|-----|------|
| 1 | Clock-in/out (15) | OK | `POST /api/shifts/:id/clock-in` + `Attendance` model. |
| 2 | Aggregate ל-month hours | שבור | ב-15 אין endpoint `GET /api/attendance/monthly?employeeId&year&month` שמסכם hours+overtime+sick. |
| 3 | חישוב שכר (16) | OK מקומי | `POST /api/payroll/calculate` — מקבל ידנית `workDays, sickDays`. **לא משולב עם 15**. |
| 4 | תלוש PDF | OK | `generatePayslip()` ב-16. |
| 5 | 102/126 | OK | `generateReport102` / `126` ב-16. |
| 6 | חיוב חשבון בנק | חסר | אין integration ל-Massav / mobile banking / Cardcom (Cardcom הוא לקבלת תשלום, לא להוצאה). |
| 7 | רישום הוצאה (22) | חסר | אין `POST /api/expenses` שמתעדכן מ-16. ב-22 יש `Expense` model אבל ה-data לא מגיע. |

### מה שבור

- 16 משתמש ב-in-memory store בלבד — לא Prisma, לא DB. נתונים לא נשמרים בין restarts.
- אין `Employee.id` משותף בין 15 ו-16 (15 = Prisma postgres, 16 = in-memory Map).
- אין שדה bank-account encrypted ב-16 (יש בלא-מוצפן בlocal store).

### מה צריך לבנות

- `15 → 16 sync`: cron יומי `GET attendance → upsert hours per employee per month` ב-16.
- `16` → Prisma + שיתוף Employee schema עם 15.
- מודול חדש "Banking" שמבצע batch transfer (Massav format).
- `16 → 22 ETL`: payslip totals → `Expense{category=SALARY}`.

---

## ניתוח רוחבי — שורש הבעיות

### 1. כפילות סכמה / חוסר משותף

| Entity | מופיע ב | מקור אמת |
|--------|---------|----------|
| Customer | 05, 06, 08, 11, 17, 22 | אין |
| Order | 06, 07, 08 | אין |
| Event | 06 (Order.eventDate), 09, 13, 22 | אין |
| Invoice | 06, 17, 18, 22 | אמור להיות 17→18 |
| Product | 09, 10, 11 | אין |
| Supplier | 10, 11, 12 | אמור להיות 11 |
| Employee | 15, 16 (in-mem!) | אמור להיות 15 |
| Payment | 17, 19, 22 | אין |

### 2. ערוצי תקשורת בין מודולים — כולם מנותקים

- אף מודול לא מציג OpenAPI/SDK שמודולים אחרים יכולים לצרוך.
- 12 OCR מצפה שכרגע מודולים יספרו לו דברים (`new supplier alert`) — אבל אין consumer לזה.
- 19 Cardcom webhook מעדכן רק `IntegrationLog` שלו.
- 13 Events SSE broadcast — אבל אף מודול לא מאזין.

### 3. אין auth/identity משותף

- 05, 06, 17, 22 — לכל אחד `User`/`Role`/`tRPC ctx` משלו.
- 07 Portal יש לו `requireUser` עם session local.
- 15 HR יש `JWT + WebAuthn`.
- אין JWT/JWKS משותף, אין SSO/OIDC, אין tenant id.

### 4. אין Notification Service אחד

- 06 emit `notification.send` עם `console.info` בלבד.
- 17 reminders יש SMTP-stub.
- 22 BI יש SendGrid.
- 24 יש `MAIL_WEBHOOK_URL`.

### 5. אין Identity של אירוע/הזמנה חוצה מערכת

- בלי `correlationId` / `traceId` — אי אפשר לעקוב אחרי lead מ-24 עד payslip ב-16.

---

## רשימת hooks / APIs / שירותים חסרים לחיבור כל התרחישים

### A. Domain Events / Message Bus (חוצה כל המודולים)

| Topic | Producer | Consumer | משימה חסרה |
|-------|----------|----------|-----------|
| `lead.captured` | 24 | 05 | adapter שממפה payload |
| `lead.won` | 05 | 17 | יצירת QUOTE |
| `quote.sent` | 17 | 07 + 24 (email) | signing link |
| `quote.accepted` | 07 | 06, 17 | יצירת Order + הפיכת Quote ל-ORDER |
| `order.approved` | 06 | 08, 09, 13, 14, 17 | menu lock, prep plan, gantt, delivery slot, tax-invoice |
| `prep.planned` | 09 | 10 | inventory demand check |
| `inventory.shortage` | 10 | 11 | auto-PO draft |
| `po.received` | 11 | 10, 12, 17 | adjust stock + reconcile OCR + AP invoice |
| `ocr.invoice.approved` | 12 | 10, 11, 17, 18 | adjust + GRN + AP doc + iCount |
| `event.created` | 13 | 15 | shift requests |
| `shift.clocked-out` | 15 | 16, 22 | hours + labor cost |
| `delivery.created` | 06 | 14 | פתיחת משלוח אמיתי |
| `delivery.completed` | 14 | 06, 17 | order done + invoice issue |
| `document.issued` | 17 | 18, 24-email | sync iCount + send to customer |
| `payment.intent.created` | 17 | 19 | charge link |
| `charge.success` | 19 | 17, 22 | payment record + revenue |
| `charge.failed` | 19 | 05, 17 | follow-up + dunning |
| `order.cancelled` | 06 | 11 (PO cancel), 15 (shift release), 17 (credit), 19 (refund), 22 (BI) | חוסר מוחלט |
| `subscription.tick` | 06 cron | 06 + 19 | daily order + recurring charge |
| `payroll.calculated` | 16 | 22 | expense entry |

### B. REST/RPC endpoints חסרים

- **05 CRM**:
  - `POST /api/leads/from-public-site` (פשוט יקבל payload של 24 ויעבד).
  - `POST /api/leads/:id/won` → trigger quote.
- **06 Orders**:
  - `POST /api/orders/from-quote` (קלט: quoteId, customer).
  - `POST /api/subscriptions/:id/tick` (cron-callable).
  - `GET /api/orders/:id/effects-bus` (debug).
- **07 Portal**:
  - `GET /api/quotes/:id` — proxy ל-17.
  - `POST /api/quotes/:id/accept` → emit event.
- **09 Recipes**:
  - `POST /api/prep/from-order/:orderId` (יתאר ל-09 איך לקרוא Order חיצוני).
- **10 Inventory**:
  - `POST /api/inventory/plan?orderId=X` — מחזיר חוסרים.
  - `POST /api/inventory/movements` (קלט אחיד) — לקליטה מ-12 ו-11.
- **11 Suppliers**:
  - `POST /api/purchase-orders/auto-from-shortage` (קלט: רשימת items).
  - `POST /api/purchase-orders/:id/cancel`.
- **12 OCR**:
  - `POST /api/verify/:hash/approve` — שיהיה אקפליציטי, שיריץ downstream.
- **13 Events**:
  - `POST /api/events/from-order/:orderId`.
  - `POST /api/events/:id/cancel` → release shifts.
- **14 Logistics**:
  - `POST /api/deliveries/from-order/:orderId`.
- **15 HR**:
  - `GET /api/attendance/monthly?employeeId&year&month` (סיכום שעות לחישוב שכר).
  - `POST /api/shifts/from-event` (קלט: eventId, requirements[]).
  - `DELETE /api/shifts/by-event/:eventId`.
- **16 Payroll**:
  - migration ל-Prisma + שימוש ב-Employee מ-15.
  - `POST /api/payroll/calculate-from-attendance` (אוטומטי).
- **17 Invoices**:
  - `POST /api/documents/from-lead/:leadId` (יוצר QUOTE).
  - `POST /api/documents/aggregate-subscription`.
  - `POST /api/documents/:id/credit-note` (אוטומטי מ-cancel).
- **18 iCount**:
  - `POST /sync/document/:docId` (משוך מ-17 ושלח ל-iCount).
- **19 Cardcom**:
  - `POST /api/recurring/setup` (קלט: token, schedule).
  - webhook → call back ל-17.
- **22 BI**:
  - ETL workers שמושכים מכל ה-modules.

### C. שירותים חסרים שצריך לבנות

1. **`@catering/contracts` package** — TypeScript types + Zod schemas משותפים: `CustomerId, OrderId, EventId, DocumentId, EmployeeId, SupplierId, ProductId`, וכל ה-event payloads.
2. **`orchestrator` service** — מודול חדש שמכיל את כל ה-hooks ופונה ל-modules דרך HTTP. יישום SAGA לתרחיש cancel.
3. **`notification-hub`** — שירות אחד עם adapters: WhatsApp Cloud API, SMTP, SMS, Push. כל ה-modules ידחפו אליו.
4. **`identity-service` (auth+RBAC)** — JWT/JWKS משותף + tenant-id בכל request.
5. **`event-bus`** — Redis Streams (או NATS) + workers ב-BullMQ עם topic subscription.
6. **`master-data` service** — קטלוג products+suppliers+customers אחד.

---

## מינימום נדרש ל-MVP

### MVP1 — חתונה אחת מקצה לקצה (ידני אבל אפשרי)

1. **Contracts package** — TypeScript types בסיסיים.
2. **REST gateway** + JWT משותף.
3. **CRM → 17 adapter**: כפתור "Convert lead to Quote" (לא צריך בוס) שמייצר QUOTE ב-17 עם פרטי הלקוח.
4. **Portal (07) משוך מ-17**: שינוי `GET /api/orders` → ימשוך גם מ-17 documents.
5. **17 → 06 adapter**: שינוי `Quote.accept` יוצר Order ב-06 (HTTP).
6. **06 → 13 adapter**: hook חדש `approved → POST 13/events`.
7. **06 → 14 adapter**: שינוי side-effect `delivery.create` → POST 14 (במקום DB מקומי).
8. **06 → 17 adapter**: side-effect `invoice.create` → POST 17 (במקום DB מקומי).
9. **17 → 19 link**: payment-link button מייצר Cardcom checkout.
10. **19 webhook → 17 POST payment**: סוגר את הלולאה.
11. **17 → 18 sync**: כפתור "שלח ל-iCount" (manual לפי MVP).

### MVP2 — אוטומציה ו-2 תרחישים נוספים

12. Cron `subscription.tick` ל-06.
13. Cardcom recurring + 17 aggregator.
14. Cancellation SAGA basic.
15. 15→16 attendance sync.
16. 12 OCR → 11/10/17 hooks.

### MVP3 — Production-ready

17. Notification hub.
18. ETL ל-22 BI.
19. Master data consolidation.
20. Cancellation SAGA מלא + compensations.

---

## סיכום

המערכת היא **17 מוצרי בוטיק** ולא **מערכת אחת**. כל worktree עובד יפה בנפרד, אבל לתרחיש עסקי שלם — **אף תרחיש מ-5 לא חי מקצה לקצה** ללא בניית שכבת תזמור.

**ROI הכי גבוה**: בניית `@catering/contracts` + 5 HTTP adapters בסיסיים מאפשרים לסגור את MVP1 בכ-3–5 ימי עבודה לכל מודול.

**סיכון הכי גדול**: המשך פיתוח של פיצ'רים בתוך-המודולים בלי לסגור integration → ככל שיש יותר state מקומי, חיבור מאוחר יותר יידרוש migrations מקיפות.

</div>
