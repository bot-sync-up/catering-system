/**
 * IBillingAdapter — ממשק אחיד לכל ספקי החיוב
 * (iCount, GreenInvoice, Rivhit, Mock)
 *
 * המטרה: אם iCount נופל, אפשר לעבור ל-fallback בלי שינוי קוד.
 */

import {
  InvoiceRequest,
  InvoiceResponse,
  AllocationRequest,
  AllocationResponse,
  Customer,
  Supplier,
  DocumentType,
} from '../types';

export interface IBillingAdapter {
  /** שם הספק — לצרכי logging ו-routing */
  readonly providerName: 'icount' | 'greeninvoice' | 'rivhit' | 'mock';

  /** האם הספק זמין כרגע? */
  isHealthy(): Promise<boolean>;

  // documents
  createInvoice(req: InvoiceRequest): Promise<InvoiceResponse>;
  createTaxInvoice(req: Omit<InvoiceRequest, 'doctype'>): Promise<InvoiceResponse>;
  createReceipt(req: Omit<InvoiceRequest, 'doctype'>): Promise<InvoiceResponse>;
  createQuote(req: Omit<InvoiceRequest, 'doctype'>): Promise<InvoiceResponse>;
  createCreditNote(req: Omit<InvoiceRequest, 'doctype'>): Promise<InvoiceResponse>;

  cancelDocument(params: { doc_id?: number; docnum?: string; reason: string }): Promise<{ status: boolean; cancellation_doc_id?: number }>;

  // allocation
  getAllocationNumber(req: AllocationRequest): Promise<AllocationResponse>;

  // entities
  syncCustomer(c: Customer): Promise<{ status: boolean; client_id: string }>;
  syncSupplier(s: Supplier): Promise<{ status: boolean; supplier_id: string }>;

  // reporting
  listTransactions(params: {
    from: string;
    to: string;
    doctype?: DocumentType;
    page?: number;
    limit?: number;
  }): Promise<{ items: unknown[]; total: number }>;
}
