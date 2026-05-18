/**
 * Domain Events - הגדרת כל האירועים העסקיים בפלטפורמת הקייטרינג.
 *
 * כל אירוע מכיל metadata סטנדרטי (id, timestamp, source, correlationId)
 * ו-payload ספציפי לסוג האירוע.
 */

export interface EventMetadata {
  /** מזהה ייחודי של האירוע (UUID v4) */
  id: string;
  /** חותמת זמן ISO 8601 */
  timestamp: string;
  /** מקור האירוע - שם השירות שפלט אותו */
  source: string;
  /** מזהה מתאם לשרשור אירועים (saga / flow) */
  correlationId?: string;
  /** מזהה האירוע הקודם בשרשרת */
  causationId?: string;
  /** גרסת ה-schema של ה-payload */
  schemaVersion: number;
}

// ────────────────────────────────────────────────────────────────
// CRM / Lead
// ────────────────────────────────────────────────────────────────

export interface LeadCreatedPayload {
  leadId: string;
  customerName: string;
  phone: string;
  email?: string;
  source: 'website' | 'phone' | 'referral' | 'portal';
  eventType?: string;
  guestsEstimate?: number;
  eventDateEstimate?: string;
}

export interface LeadQualifiedPayload {
  leadId: string;
  qualifiedBy: string;
  score: number;
  notes?: string;
}

// ────────────────────────────────────────────────────────────────
// Quotes
// ────────────────────────────────────────────────────────────────

export interface QuoteSentPayload {
  quoteId: string;
  leadId: string;
  customerId: string;
  totalAmount: number;
  currency: 'ILS' | 'USD' | 'EUR';
  validUntil: string;
  items: QuoteItem[];
}

export interface QuoteItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface QuoteAcceptedPayload {
  quoteId: string;
  customerId: string;
  acceptedAt: string;
  acceptedBy: string;
}

// ────────────────────────────────────────────────────────────────
// Orders
// ────────────────────────────────────────────────────────────────

export interface OrderPlacedPayload {
  orderId: string;
  quoteId?: string;
  customerId: string;
  eventId?: string;
  totalAmount: number;
  items: OrderItem[];
  scheduledDate: string;
  deliveryAddress?: string;
}

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface OrderApprovedPayload {
  orderId: string;
  approvedBy: string;
  approvedAt: string;
}

export interface OrderCancelledPayload {
  orderId: string;
  reason: string;
  cancelledBy: string;
  cancelledAt: string;
  refundRequired: boolean;
}

// ────────────────────────────────────────────────────────────────
// Portal
// ────────────────────────────────────────────────────────────────

export interface PortalSubmittedPayload {
  submissionId: string;
  customerId: string;
  formType: 'order' | 'inquiry' | 'event-booking';
  data: Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────────
// Payments
// ────────────────────────────────────────────────────────────────

export interface PaymentReceivedPayload {
  paymentId: string;
  invoiceId?: string;
  orderId?: string;
  amount: number;
  currency: 'ILS' | 'USD' | 'EUR';
  method: 'credit-card' | 'bank-transfer' | 'cash' | 'check';
  reference: string;
  receivedAt: string;
}

export interface PaymentFailedPayload {
  paymentId: string;
  invoiceId?: string;
  amount: number;
  reason: string;
  errorCode?: string;
  attemptNumber: number;
  failedAt: string;
}

export interface PaymentCapturedPayload {
  paymentId: string;
  invoiceId: string;
  amount: number;
  cardcomTransactionId: string;
  capturedAt: string;
}

// ────────────────────────────────────────────────────────────────
// Invoices
// ────────────────────────────────────────────────────────────────

export interface InvoiceIssuedPayload {
  invoiceId: string;
  orderId?: string;
  customerId: string;
  totalAmount: number;
  currency: 'ILS' | 'USD' | 'EUR';
  issuedAt: string;
  dueDate: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  vatRate: number;
}

export interface InvoicePaidPayload {
  invoiceId: string;
  paidAt: string;
  paymentId: string;
  fullyPaid: boolean;
}

export interface InvoiceDuePayload {
  invoiceId: string;
  customerId: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
}

// ────────────────────────────────────────────────────────────────
// Events (אירועי קייטרינג)
// ────────────────────────────────────────────────────────────────

export interface EventScheduledPayload {
  eventId: string;
  orderId: string;
  customerId: string;
  scheduledDate: string;
  venue: string;
  guestsCount: number;
  eventType: string;
}

export interface EventCompletedPayload {
  eventId: string;
  completedAt: string;
  actualGuests?: number;
  notes?: string;
}

export interface EventReadyPayload {
  eventId: string;
  orderId: string;
  readyAt: string;
}

// ────────────────────────────────────────────────────────────────
// Delivery / Logistics
// ────────────────────────────────────────────────────────────────

export interface DeliveryDispatchedPayload {
  deliveryId: string;
  eventId?: string;
  orderId: string;
  driverId: string;
  vehicleId: string;
  dispatchedAt: string;
  estimatedArrival: string;
}

export interface DeliveryCompletedPayload {
  deliveryId: string;
  completedAt: string;
  signedBy?: string;
  notes?: string;
}

// ────────────────────────────────────────────────────────────────
// Inventory / Purchasing
// ────────────────────────────────────────────────────────────────

export interface InventoryLowPayload {
  sku: string;
  productName: string;
  currentQuantity: number;
  thresholdQuantity: number;
  reorderQuantity: number;
  warehouseId: string;
}

export interface InventoryReceivedPayload {
  receivedId: string;
  poNumber?: string;
  sku: string;
  quantity: number;
  warehouseId: string;
  receivedAt: string;
}

// ────────────────────────────────────────────────────────────────
// HR / Payroll
// ────────────────────────────────────────────────────────────────

export interface EmployeeClockedPayload {
  employeeId: string;
  action: 'clock-in' | 'clock-out';
  timestamp: string;
  location?: string;
  eventId?: string;
}

export interface PayrollCalculatedPayload {
  payrollId: string;
  employeeId: string;
  period: string;
  hoursWorked: number;
  grossAmount: number;
  netAmount: number;
  calculatedAt: string;
}

export interface MonthClosedPayload {
  period: string;
  closedAt: string;
  closedBy: string;
}

// ────────────────────────────────────────────────────────────────
// Event Map - מיפוי טייפ-מסטר של כל האירועים
// ────────────────────────────────────────────────────────────────

export interface DomainEventMap {
  'lead.created': LeadCreatedPayload;
  'lead.qualified': LeadQualifiedPayload;
  'quote.sent': QuoteSentPayload;
  'quote.accepted': QuoteAcceptedPayload;
  'order.placed': OrderPlacedPayload;
  'order.approved': OrderApprovedPayload;
  'order.cancelled': OrderCancelledPayload;
  'portal.submitted': PortalSubmittedPayload;
  'payment.received': PaymentReceivedPayload;
  'payment.failed': PaymentFailedPayload;
  'payment.captured': PaymentCapturedPayload;
  'invoice.issued': InvoiceIssuedPayload;
  'invoice.paid': InvoicePaidPayload;
  'invoice.due': InvoiceDuePayload;
  'event.scheduled': EventScheduledPayload;
  'event.completed': EventCompletedPayload;
  'event.ready': EventReadyPayload;
  'delivery.dispatched': DeliveryDispatchedPayload;
  'delivery.completed': DeliveryCompletedPayload;
  'inventory.low': InventoryLowPayload;
  'inventory.received': InventoryReceivedPayload;
  'employee.clocked': EmployeeClockedPayload;
  'payroll.calculated': PayrollCalculatedPayload;
  'month.closed': MonthClosedPayload;
}

export type DomainEventName = keyof DomainEventMap;

export interface DomainEvent<K extends DomainEventName = DomainEventName> {
  name: K;
  metadata: EventMetadata;
  payload: DomainEventMap[K];
}

export type EventHandler<K extends DomainEventName> = (
  event: DomainEvent<K>,
) => Promise<void>;
