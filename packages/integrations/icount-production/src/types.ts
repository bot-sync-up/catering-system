/**
 * iCount Production - Types
 * תוכנה מאושרת 1346 — Israel Tax Authority Approved Software
 */

import { z } from 'zod';

// ============================================================
// Authentication
// ============================================================

export interface IcountCredentials {
  cid: string;            // Company ID
  user: string;           // Username
  password: string;       // Password
  apiToken?: string;      // Optional API token (recommended)
  sid?: string;           // Session ID after login
}

export interface IcountClientOptions {
  credentials: IcountCredentials;
  baseUrl?: string;       // default: https://api.icount.co.il/api/v3.php
  timeout?: number;       // ms
  testMode?: boolean;
  logger?: Logger;
  approvedSoftwareNumber?: string; // 1346 default
}

// ============================================================
// Documents (Israeli Tax Authority types)
// ============================================================

export enum DocumentType {
  INVOICE = 'invoice',                          // חשבונית עסקה
  TAX_INVOICE = 'invrec',                       // חשבונית מס
  TAX_INVOICE_RECEIPT = 'invrec',               // חשבונית מס/קבלה
  RECEIPT = 'receipt',                          // קבלה
  QUOTE = 'quote',                              // הצעת מחיר
  ORDER = 'order',                              // הזמנה
  DELIVERY = 'delivery',                        // תעודת משלוח
  CREDIT_NOTE = 'credit_invoice',               // חשבונית זיכוי
  TAX_INVOICE_REFUND = 'tax_invoice_refund',    // חשבונית מס זיכוי
  RETURN = 'return',                            // החזרה
  PROFORMA = 'invoice',                         // פרופורמה
}

export interface LineItem {
  description: string;
  quantity: number;
  unitprice: number;        // in agorot or shekels (configurable)
  catalog_number?: string;
  vat?: number;             // 17% default
  currency_code?: string;   // ILS, USD, EUR
  total?: number;
}

export interface Customer {
  client_id?: string;
  client_name: string;
  client_email?: string;
  vat_id?: string;          // ע.מ. / ח.פ.
  phone?: string;
  address?: string;
  city?: string;
  country?: 'IL' | string;
  zip?: string;
}

export interface Supplier {
  supplier_id?: string;
  supplier_name: string;
  vat_id: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface PaymentDetails {
  sum: number;
  payment_type: 'cash' | 'cheque' | 'creditcard' | 'wire' | 'other' | 'paypal';
  cc_number?: string;       // last 4 digits only
  cc_type?: 'visa' | 'mastercard' | 'amex' | 'isracard' | 'diners';
  cheque_num?: string;
  cheque_bank?: string;
  cheque_branch?: string;
  cheque_account?: string;
  payment_date?: string;    // YYYY-MM-DD
  payer_name?: string;
  confirmation_code?: string;
}

export interface InvoiceRequest {
  doctype: DocumentType;
  client_id?: string;
  client_name: string;
  client_email?: string;
  vat_id?: string;
  items: LineItem[];
  payment?: PaymentDetails[];
  description?: string;
  lang?: 'he' | 'en';
  currency_code?: 'ILS' | 'USD' | 'EUR' | 'GBP';
  email_to_client?: boolean;
  email_text?: string;
  hwd?: boolean;            // hide vat
  totalwithvatincluded?: boolean;
  allocation_num?: string;  // מספר הקצאה — Israel Model
  reference?: string;
  date?: string;            // issue date
  due_date?: string;
}

export interface InvoiceResponse {
  status: boolean;
  doc_num?: number;
  docnum?: string;
  doc_url?: string;
  doc_id?: number;
  allocation_num?: string;
  pdf_link?: string;
  total?: number;
  errors?: string[];
  error_code?: string;
}

// ============================================================
// Allocation (Israel Model 1346)
// ============================================================

export interface AllocationRequest {
  amount: number;           // total amount including VAT
  doctype: DocumentType;
  date: string;             // YYYY-MM-DD
  customer_vat_id?: string;
  customer_name: string;
  currency?: string;
}

export interface AllocationResponse {
  allocation_num: string;
  status: 'approved' | 'rejected' | 'pending';
  expires_at?: string;
  reason?: string;
  request_id?: string;
}

// ============================================================
// Reports
// ============================================================

export interface PCN874Record {
  type: 'A' | 'B' | 'Z';     // A=sales, B=purchases, Z=summary
  doc_type: string;
  doc_num: string;
  doc_date: string;
  vat_id: string;
  amount_no_vat: number;
  vat: number;
  total: number;
  allocation_num?: string;
}

export interface PCN874Period {
  year: number;
  month: number;             // 1-12
  records: PCN874Record[];
}

export interface Form126Entry {
  employee_id: string;       // ת.ז.
  full_name: string;
  total_salary: number;
  total_tax: number;
  total_ni: number;          // ביטוח לאומי
  total_health: number;      // בריאות
}

export interface Form856Entry {
  party_vat_id: string;
  party_name: string;
  total_transactions: number;
  total_amount_no_vat: number;
  total_vat: number;
  party_type: 'customer' | 'supplier';
}

// ============================================================
// Webhooks
// ============================================================

export interface WebhookEvent {
  id: string;
  type: 'invoice.created' | 'invoice.cancelled' | 'invoice.paid'
      | 'receipt.created' | 'allocation.approved' | 'allocation.rejected'
      | 'customer.created' | 'customer.updated' | 'supplier.created';
  cid: string;
  timestamp: string;
  signature: string;
  data: Record<string, unknown>;
}

// ============================================================
// Integration Log
// ============================================================

export interface IntegrationLogEntry {
  id: string;
  timestamp: string;
  provider: 'icount' | 'greeninvoice' | 'rivhit' | 'mock';
  operation: string;
  method: string;
  url?: string;
  request_payload?: unknown;
  response_payload?: unknown;
  status_code?: number;
  success: boolean;
  error?: string;
  attempt: number;
  duration_ms: number;
  cid?: string;
  reference_id?: string;
}

// ============================================================
// Logger
// ============================================================

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

// ============================================================
// Zod Validators
// ============================================================

export const InvoiceRequestSchema = z.object({
  doctype: z.nativeEnum(DocumentType),
  client_name: z.string().min(1),
  client_email: z.string().email().optional(),
  vat_id: z.string().regex(/^\d{9}$/).optional(), // 9 digit Israeli VAT
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitprice: z.number(),
    vat: z.number().min(0).max(100).optional(),
  })).min(1),
});

export const AllocationRequestSchema = z.object({
  amount: z.number().positive(),
  doctype: z.nativeEnum(DocumentType),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customer_name: z.string().min(1),
  customer_vat_id: z.string().regex(/^\d{9}$/).optional(),
});

export const WebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  cid: z.string(),
  timestamp: z.string(),
  signature: z.string(),
  data: z.record(z.unknown()),
});
