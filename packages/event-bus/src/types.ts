/**
 * types.ts — הגדרות הטיפוסים של כל ה-domain events במערכת.
 *
 * כל event מכיל:
 *   - id      : מזהה ייחודי לאירוע (idempotency key)
 *   - type    : שם ה-event (string literal)
 *   - occurredAt : ISO timestamp
 *   - payload : ה-data של ה-event
 *   - metadata: meta נוסף (traceId, correlationId, source וכו')
 *
 * רשימת ה-events נשמרת ב-`EventTypeMap` כדי לאפשר type safety מלאה
 * ב-`publish` וב-`subscribe`.
 */

export interface EventMetadata {
  /** מזהה traceId לקישור בין אירועים באותו flow */
  traceId?: string;
  /** correlationId — לקישור בין בקשה לתגובה */
  correlationId?: string;
  /** מקור האירוע (איזה service פרסם אותו) */
  source?: string;
  /** מי המשתמש שיזם את הפעולה */
  userId?: string;
  /** ניסיון שלישי? לשימוש פנימי של retry/DLQ */
  attempt?: number;
}

export interface DomainEvent<TType extends string, TPayload> {
  id: string;
  type: TType;
  occurredAt: string;
  payload: TPayload;
  metadata?: EventMetadata;
}

// ---------------------------------------------------------------------------
//                              Lead / CRM
// ---------------------------------------------------------------------------

export interface LeadCreatedPayload {
  leadId: string;
  customerName: string;
  phone: string;
  email?: string;
  source?: string;
  estimatedValue?: number;
}

// ---------------------------------------------------------------------------
//                              Quotes
// ---------------------------------------------------------------------------

export interface QuoteSentPayload {
  quoteId: string;
  leadId: string;
  amount: number;
  currency: string;
  items: Array<{ sku: string; quantity: number; unitPrice: number }>;
}

export interface QuoteAcceptedPayload {
  quoteId: string;
  leadId: string;
  acceptedAt: string;
}

// ---------------------------------------------------------------------------
//                              Orders
// ---------------------------------------------------------------------------

export interface OrderPlacedPayload {
  orderId: string;
  customerId: string;
  quoteId?: string;
  totalAmount: number;
  currency: string;
  eventDate?: string;
  items: Array<{ sku: string; quantity: number; unitPrice: number }>;
}

export interface OrderApprovedPayload {
  orderId: string;
  approvedBy: string;
}

export interface OrderCancelledPayload {
  orderId: string;
  reason: string;
  cancelledBy: string;
  refundRequired: boolean;
}

// ---------------------------------------------------------------------------
//                              Payments
// ---------------------------------------------------------------------------

export interface PaymentReceivedPayload {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  method: 'credit_card' | 'bank_transfer' | 'cash' | 'cheque';
  externalRef?: string;
}

export interface PaymentFailedPayload {
  paymentId: string;
  orderId: string;
  amount: number;
  reason: string;
  errorCode?: string;
}

// ---------------------------------------------------------------------------
//                              Invoices
// ---------------------------------------------------------------------------

export interface InvoiceIssuedPayload {
  invoiceId: string;
  orderId: string;
  amount: number;
  currency: string;
  externalRef?: string;
}

export interface InvoicePaidPayload {
  invoiceId: string;
  paidAt: string;
  paymentId: string;
}

// ---------------------------------------------------------------------------
//                              Events (catering)
// ---------------------------------------------------------------------------

export interface EventScheduledPayload {
  eventId: string;
  orderId: string;
  scheduledAt: string;
  venue: string;
  guests: number;
}

export interface EventCompletedPayload {
  eventId: string;
  completedAt: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
//                              Delivery
// ---------------------------------------------------------------------------

export interface DeliveryDispatchedPayload {
  deliveryId: string;
  orderId: string;
  driverId: string;
  dispatchedAt: string;
}

export interface DeliveryCompletedPayload {
  deliveryId: string;
  orderId: string;
  completedAt: string;
  signature?: string;
}

// ---------------------------------------------------------------------------
//                              Inventory / Purchasing
// ---------------------------------------------------------------------------

export interface InventoryLowPayload {
  sku: string;
  currentQty: number;
  minQty: number;
  warehouse?: string;
}

export interface InventoryReceivedPayload {
  sku: string;
  receivedQty: number;
  purchaseOrderId?: string;
  warehouse?: string;
}

// ---------------------------------------------------------------------------
//                              HR / Payroll
// ---------------------------------------------------------------------------

export interface EmployeeClockedPayload {
  employeeId: string;
  action: 'in' | 'out';
  at: string;
  location?: string;
}

export interface PayrollCalculatedPayload {
  payrollId: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  employeeCount: number;
}

// ---------------------------------------------------------------------------
//                              EventTypeMap
// ---------------------------------------------------------------------------

/**
 * מיפוי שם-event → טיפוס payload.
 * משמש לכל ה-type safety בפרויקט.
 */
export interface EventTypeMap {
  'lead.created': LeadCreatedPayload;
  'quote.sent': QuoteSentPayload;
  'quote.accepted': QuoteAcceptedPayload;
  'order.placed': OrderPlacedPayload;
  'order.approved': OrderApprovedPayload;
  'order.cancelled': OrderCancelledPayload;
  'payment.received': PaymentReceivedPayload;
  'payment.failed': PaymentFailedPayload;
  'invoice.issued': InvoiceIssuedPayload;
  'invoice.paid': InvoicePaidPayload;
  'event.scheduled': EventScheduledPayload;
  'event.completed': EventCompletedPayload;
  'delivery.dispatched': DeliveryDispatchedPayload;
  'delivery.completed': DeliveryCompletedPayload;
  'inventory.low': InventoryLowPayload;
  'inventory.received': InventoryReceivedPayload;
  'employee.clocked': EmployeeClockedPayload;
  'payroll.calculated': PayrollCalculatedPayload;
}

export type EventName = keyof EventTypeMap;

export type AnyDomainEvent = {
  [K in EventName]: DomainEvent<K, EventTypeMap[K]>;
}[EventName];

export type EventHandler<TName extends EventName> = (
  event: DomainEvent<TName, EventTypeMap[TName]>
) => Promise<void> | void;

/** אופציות לפרסום event (delay, priority וכו') */
export interface PublishOptions {
  delayMs?: number;
  priority?: number;
  attempts?: number;
  /** ביטול הוספת event_id אוטומטי — לשימוש בבדיקות */
  id?: string;
}

/** קונפיגורציה של Redis */
export interface RedisConnectionConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  /** url מלא — אם מסופק, גובר על host/port */
  url?: string;
  /** Redis Streams במקום BullMQ רגיל (לאירועי fan-out) */
  useStreams?: boolean;
}
