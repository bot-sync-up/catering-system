# מפת חיווט אירועים (WIRING MAP)

מסמך זה מפרט את כל ה-flows האירועיים בפלטפורמת הקייטרינג —
מי מפרסם כל אירוע ומי מאזין לו, וכן מה ה-side-effect של ה-adapter.

> כל ה-publishers נמצאים תחת `src/publishers/` וכל ה-adapters מתוך
> `@catering/integration-adapters`. ה-wiring המרכזי ב-`src/subscribers/subscribe-all.ts`.

---

## 1. CRM Flow — מהליד להצעה

```
CRM:lead.created
  (publisher: CrmPublisher.publishLeadCreated)
  → ללא adapter — רק לוגינג/אנליטיקה

CRM:lead.qualified
  (publisher: CrmPublisher.publishLeadQualified)
  → adapter:crm-to-finance (CrmToFinanceAdapter)
    → finance.createQuote()
    → publishes: quote.sent
```

## 2. Portal Flow — מהפורטל להזמנה

```
Portal:portal.submitted
  (publisher: PortalPublisher.publishPortalSubmitted)
  → adapter:portal-to-orders (PortalToOrdersAdapter)
    → orders.createOrder()
    → publishes: order.placed
```

## 3. Orders Flow — מההזמנה לחשבונית/מטבח/אירוע

```
Orders:order.placed
  (publisher: OrdersPublisher.publishOrderPlaced)
  → adapter:orders-to-events (OrdersToEventsAdapter)
    → scheduler.scheduleEvent()
    → publishes: event.scheduled

Orders:order.approved
  (publisher: OrdersPublisher.publishOrderApproved)
  → adapter:orders-to-finance (OrdersToFinanceAdapter)
    → invoice.issueInvoice()
    → publishes: invoice.issued
  → adapter:orders-to-kitchen (OrdersToKitchenAdapter)
    → kitchen.createPrepTasks()

Orders:order.cancelled
  (publisher: OrdersPublisher.publishOrderCancelled)
  → ⚡ TRIGGER ל-cancelEventSaga (8 שלבים, ראה event-bus/saga)
```

## 4. Finance Flow — חשבוניות לתשלום וסנכרון iCount

```
Finance:invoice.issued
  (publisher: FinancePublisher.publishInvoiceIssued)
  → adapter:finance-to-icount (FinanceToIcountAdapter)
    → icount.createInvoice() + icount.allocate()

Finance:invoice.due
  (publisher: FinancePublisher.publishInvoiceDue — מופעל ע"י cron)
  → adapter:finance-to-cardcom (FinanceToCardcomAdapter)
    → cardcom.chargeStoredCard()
    → publishes: payment.captured (אם הצליח) או payment.failed
```

## 5. CardCom Flow — תשלום שהתקבל מסמן חשבונית כשולמה

```
Cardcom:payment.captured
  (publisher: CardcomPublisher.publishPaymentCaptured)
  → adapter:cardcom-to-finance (CardcomToFinanceAdapter)
    → finance.markInvoicePaid()
    → publishes: invoice.paid

Cardcom:payment.failed
  → ללא adapter — הרישום ב-DLQ + alerting

Cardcom:payment.received (כל אמצעי תשלום)
  → ללא adapter ייעודי (sub-set של captured)
```

## 6. iCount Flow — Reconciliation

```
iCount:allocation.received  (mapping: payment.received)
  (publisher: IcountPublisher.publishAllocationReceived)
  → adapter:cardcom-to-finance (משותף ל-payment.received? לא)
  → ללא adapter ייעודי (ה-payment.received נצרך ע"י reporting + reconciliation)
```

## 7. Kitchen Flow — מההכנה למשלוח

```
Kitchen:prep.completed  (mapping: event.ready)
  (publisher: KitchenPublisher.publishPrepCompleted)
  → adapter:orders-to-logistics (OrdersToLogisticsAdapter)
    → logistics.createDelivery()
    → publishes: delivery.dispatched
```

## 8. Events Flow — מחזור החיים של אירוע קייטרינג

```
Events:event.scheduled
  (publisher: EventsPublisher.publishEventScheduled)
  → ללא adapter — סטטוס ב-Calendar

Events:event.ready
  (publisher: EventsPublisher.publishEventReady)
  → adapter:orders-to-logistics (OrdersToLogisticsAdapter)
    → logistics.createDelivery()
    → publishes: delivery.dispatched

Events:event.completed
  (publisher: EventsPublisher.publishEventCompleted)
  → ללא adapter — סטטיסטיקות + survey
```

## 9. Delivery Flow

```
Delivery:delivery.dispatched
  (publisher: DeliveryPublisher.publishDeliveryDispatched)
  → ללא adapter — push notification ללקוח, GPS tracking

Delivery:delivery.completed
  (publisher: DeliveryPublisher.publishDeliveryCompleted)
  → ללא adapter — סגירת cycle, שביעות-רצון
```

## 10. Inventory Flow

```
Inventory:inventory.low
  (publisher: InventoryPublisher.publishInventoryLow)
  → adapter:inventory-to-purchasing (InventoryToPurchasingAdapter)
    → purchasing.createPurchaseOrder()

Inventory:inventory.received
  (publisher: InventoryPublisher.publishInventoryReceived)
  → ללא adapter — עדכון stock + הגעת PO
```

## 11. HR / Payroll Flow

```
HR:employee.clocked
  (publisher: HrPublisher.publishEmployeeClocked)
  → ללא adapter — צבירת שעות ב-DB

HR:month.closed
  (publisher: HrPublisher.publishMonthClosed)
  → adapter:hr-to-payroll (HrToPayrollAdapter)
    → לכל עובד: payroll.calculatePayroll()
    → publishes: payroll.calculated (per employee)
```

---

## תרשים זרימה כללי

```
                ┌─────────┐
                │   CRM   │
                └────┬────┘
                     │ lead.qualified
                     ▼
              ┌─────────────────┐
              │ crm-to-finance  │
              └────────┬────────┘
                       │ quote.sent
                       ▼
                  (acceptance)
                       │
                       ▼
                ┌──────────┐
   portal.→  ──▶│  Orders  │
                └────┬─────┘
                     │ order.placed
        ┌────────────┼─────────────┐
        ▼            ▼             ▼
   to-events    to-kitchen     to-finance
        │            │             │
        ▼            ▼             ▼
   event.sch.   prep tasks    invoice.issued
                                   │
                                   ▼
                             to-icount
                                   │
                                   ▼
                            iCount sync
                                   │
   (cron)──▶ invoice.due ──▶ to-cardcom
                                   │
                                   ▼
                            payment.captured
                                   │
                                   ▼
                           cardcom-to-finance
                                   │
                                   ▼
                             invoice.paid

                ┌─────────┐
                │  HR mo. │──▶ hr-to-payroll ──▶ payroll.calc.
                └─────────┘

                ┌─────────┐
                │ Inv low │──▶ inv-to-purchasing ──▶ PO
                └─────────┘
```

## SAGA - ביטול אירוע (8 שלבים)

`order.cancelled` או triger ידני → `cancelEventSaga` רץ:

1. verify-permission        ↔ revoke
2. cancel-order             ↔ restore
3. cancel-kitchen-tasks     ↔ restore
4. unschedule-event         ↔ reschedule
5. cancel-delivery          ↔ restore
6. return-inventory         ↔ re-reserve
7. release-staff            ↔ re-assign
8. issue-refund             ↔ revoke

כל כשל באמצע → compensate חוזר אחורה בסדר הפוך.
