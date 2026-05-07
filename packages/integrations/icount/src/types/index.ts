/**
 * iCount integration - Core types
 * תואם לדרישות רשות המסים בישראל - תוכנה מאושרת 1346
 */

import { z } from 'zod';

// ============================================================================
// Configuration
// ============================================================================

export interface ICountConfig {
  apiKey: string;
  companyId: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  isProduction?: boolean;
}

// ============================================================================
// Document types - תואם רשות המסים
// ============================================================================

export enum DocumentType {
  INVOICE = 'invoice',
  TAX_INVOICE = 'tax_invoice',
  INVOICE_RECEIPT = 'invoice_receipt',
  RECEIPT = 'receipt',
  CREDIT_NOTE = 'credit_note',
  QUOTE = 'quote',
  ORDER = 'order',
  DELIVERY_NOTE = 'delivery_note',
  PROFORMA = 'proforma',
}

export enum DocumentStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  CANCELLED = 'cancelled',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

// סוגי תשלום - על פי רשות המסים
export enum PaymentMethod {
  CASH = 'cash',
  CHECK = 'check',
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  OTHER = 'other',
}

export enum VATType {
  STANDARD = 'standard',     // מע"מ רגיל 17%
  EXEMPT = 'exempt',         // פטור ממע"מ
  ZERO = 'zero',             // אפס מע"מ
  NOT_INCLUDED = 'not_included', // לא כולל מע"מ
}

// ============================================================================
// Customer / Supplier
// ============================================================================

export const CustomerSchema = z.object({
  id: z.string().optional(),
  externalId: z.string().optional(),
  name: z.string().min(1),
  taxId: z.string().optional(),         // ח.פ. / ע.מ.
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().default('IL'),
  notes: z.string().optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;

// ============================================================================
// Line items
// ============================================================================

export const LineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative().optional(),
  vatType: z.nativeEnum(VATType).default(VATType.STANDARD),
  vatRate: z.number().min(0).max(100).default(17),
  catalogNumber: z.string().optional(),
  category: z.string().optional(),
});

export type LineItem = z.infer<typeof LineItemSchema>;

// ============================================================================
// Payments
// ============================================================================

export const PaymentSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amount: z.number().positive(),
  date: z.string().or(z.date()).optional(),
  reference: z.string().optional(),
  bankCode: z.string().optional(),
  branchCode: z.string().optional(),
  accountNumber: z.string().optional(),
  checkNumber: z.string().optional(),
  cardLast4: z.string().optional(),
  cardType: z.string().optional(),
});

export type Payment = z.infer<typeof PaymentSchema>;

// ============================================================================
// Document - Invoice / Receipt / Quote
// ============================================================================

export const InvoiceInputSchema = z.object({
  type: z.nativeEnum(DocumentType),
  customerId: z.string().optional(),
  customer: CustomerSchema.optional(),
  issueDate: z.string().or(z.date()).optional(),
  dueDate: z.string().or(z.date()).optional(),
  items: z.array(LineItemSchema).min(1),
  payments: z.array(PaymentSchema).optional(),
  currency: z.string().default('ILS'),
  language: z.enum(['he', 'en']).default('he'),
  notes: z.string().optional(),
  reference: z.string().optional(),
  sendByEmail: z.boolean().default(false),
  externalId: z.string().optional(),
});

export type InvoiceInput = z.infer<typeof InvoiceInputSchema>;

export interface InvoiceOutput {
  id: string;
  documentNumber: string;
  type: DocumentType;
  status: DocumentStatus;
  allocationNumber?: string;       // מספר הקצאה - חובה לחשבונית מס מעל 5000 ש"ח
  totalAmount: number;
  vatAmount: number;
  netAmount: number;
  currency: string;
  issueDate: string;
  pdfUrl?: string;
  customer: Customer;
  items: LineItem[];
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
  raw?: unknown;
}

// ============================================================================
// Allocation Number - מספר הקצאה
// מודל ישראל: לפי דרישות רשות המיסים - חובה על חשבוניות מס מעל 5,000 ש"ח (החל מ-2024)
// ============================================================================

export interface AllocationNumberRequest {
  documentId?: string;
  documentType: DocumentType;
  totalAmount: number;
  vatAmount: number;
  customerTaxId?: string;
  issueDate: string;
}

export interface AllocationNumberResponse {
  allocationNumber: string;
  issuedAt: string;
  expiresAt?: string;
  isValid: boolean;
  signature?: string;
  raw?: unknown;
}

// ============================================================================
// VAT Report - דוח מע"מ
// ============================================================================

export interface VATReportRequest {
  fromDate: string;
  toDate: string;
  reportType?: 'monthly' | 'bi-monthly' | 'annual';
  format?: 'json' | 'csv' | 'pcn874';
}

export interface VATReportLine {
  date: string;
  documentNumber: string;
  documentType: DocumentType;
  customerTaxId?: string;
  customerName: string;
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
  allocationNumber?: string;
}

export interface VATReport {
  fromDate: string;
  toDate: string;
  totalSales: number;
  totalVAT: number;
  totalNet: number;
  totalRefunds: number;
  vatToPay: number;
  documentCount: number;
  lines: VATReportLine[];
  pcn874Format?: string;
  generatedAt: string;
}

// ============================================================================
// Transactions listing
// ============================================================================

export interface TransactionFilter {
  fromDate?: string;
  toDate?: string;
  documentType?: DocumentType;
  customerId?: string;
  status?: DocumentStatus;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ============================================================================
// Webhook events
// ============================================================================

export enum WebhookEventType {
  INVOICE_CREATED = 'invoice.created',
  INVOICE_UPDATED = 'invoice.updated',
  INVOICE_CANCELLED = 'invoice.cancelled',
  RECEIPT_CREATED = 'receipt.created',
  PAYMENT_RECEIVED = 'payment.received',
  ALLOCATION_NUMBER_ISSUED = 'allocation_number.issued',
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
}

export interface WebhookPayload {
  id: string;
  event: WebhookEventType;
  timestamp: string;
  signature: string;
  data: Record<string, unknown>;
}

// ============================================================================
// Provider abstraction
// ============================================================================

export enum ProviderName {
  ICOUNT = 'icount',
  GREEN_INVOICE = 'green_invoice',
  RIVHIT = 'rivhit',
}

export interface IntegrationProvider {
  name: ProviderName;
  createInvoice(input: InvoiceInput): Promise<InvoiceOutput>;
  createReceipt(input: InvoiceInput): Promise<InvoiceOutput>;
  createQuote(input: InvoiceInput): Promise<InvoiceOutput>;
  getAllocationNumber(req: AllocationNumberRequest): Promise<AllocationNumberResponse>;
  getVATReport(req: VATReportRequest): Promise<VATReport>;
  listTransactions(filter: TransactionFilter): Promise<PaginatedResult<InvoiceOutput>>;
  syncCustomer(customer: Customer): Promise<Customer>;
  cancelDocument(documentId: string, reason?: string): Promise<InvoiceOutput>;
}

// ============================================================================
// Errors
// ============================================================================

export class ICountError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = 'ICountError';
  }
}

export class ICountAuthError extends ICountError {
  constructor(message = 'Authentication failed', raw?: unknown) {
    super(message, 'AUTH_ERROR', 401, raw);
    this.name = 'ICountAuthError';
  }
}

export class ICountValidationError extends ICountError {
  constructor(message: string, raw?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, raw);
    this.name = 'ICountValidationError';
  }
}

export class ICountRateLimitError extends ICountError {
  constructor(message = 'Rate limit exceeded', public readonly retryAfter?: number, raw?: unknown) {
    super(message, 'RATE_LIMIT', 429, raw);
    this.name = 'ICountRateLimitError';
  }
}

export class AllocationNumberError extends ICountError {
  constructor(message: string, raw?: unknown) {
    super(message, 'ALLOCATION_NUMBER_ERROR', 422, raw);
    this.name = 'AllocationNumberError';
  }
}
