/**
 * MockAdapter — adapter ל-development ול-fallback סופי.
 * שומר את הכל ב-memory ומחזיר תשובות דטרמיניסטיות.
 */

import { v4 as uuidv4 } from 'uuid';
import { IBillingAdapter } from './IBillingAdapter';
import {
  InvoiceRequest,
  InvoiceResponse,
  AllocationRequest,
  AllocationResponse,
  Customer,
  Supplier,
  DocumentType,
} from '../types';

export class MockAdapter implements IBillingAdapter {
  readonly providerName = 'mock' as const;
  private nextDocNum = 1000;
  private allocCounter = 100_000;
  private healthy = true;

  private readonly docs: InvoiceResponse[] = [];
  private readonly customers = new Map<string, Customer>();
  private readonly suppliers = new Map<string, Supplier>();

  setHealthy(v: boolean): void {
    this.healthy = v;
  }

  async isHealthy(): Promise<boolean> {
    return this.healthy;
  }

  async createInvoice(req: InvoiceRequest): Promise<InvoiceResponse> {
    const doc_num = this.nextDocNum++;
    const total = req.items.reduce((s, i) => s + i.quantity * i.unitprice, 0);
    const resp: InvoiceResponse = {
      status: true,
      doc_num,
      docnum: String(doc_num),
      doc_id: doc_num,
      doc_url: `https://mock.local/docs/${doc_num}.pdf`,
      pdf_link: `https://mock.local/docs/${doc_num}.pdf`,
      total,
      allocation_num: req.allocation_num,
    };
    this.docs.push(resp);
    return resp;
  }

  createTaxInvoice(req: Omit<InvoiceRequest, 'doctype'>) {
    return this.createInvoice({ ...req, doctype: DocumentType.TAX_INVOICE });
  }
  createReceipt(req: Omit<InvoiceRequest, 'doctype'>) {
    return this.createInvoice({ ...req, doctype: DocumentType.RECEIPT });
  }
  createQuote(req: Omit<InvoiceRequest, 'doctype'>) {
    return this.createInvoice({ ...req, doctype: DocumentType.QUOTE });
  }
  createCreditNote(req: Omit<InvoiceRequest, 'doctype'>) {
    return this.createInvoice({ ...req, doctype: DocumentType.CREDIT_NOTE });
  }

  async cancelDocument(_params: { doc_id?: number; docnum?: string; reason: string }) {
    return { status: true, cancellation_doc_id: this.nextDocNum++ };
  }

  async getAllocationNumber(_req: AllocationRequest): Promise<AllocationResponse> {
    return {
      allocation_num: `ALLOC-${this.allocCounter++}`,
      status: 'approved',
      request_id: uuidv4(),
    };
  }

  async syncCustomer(c: Customer) {
    const id = c.client_id ?? uuidv4();
    this.customers.set(id, c);
    return { status: true, client_id: id };
  }
  async syncSupplier(s: Supplier) {
    const id = s.supplier_id ?? uuidv4();
    this.suppliers.set(id, s);
    return { status: true, supplier_id: id };
  }
  async listTransactions(_params: {
    from: string;
    to: string;
    doctype?: DocumentType;
    page?: number;
    limit?: number;
  }) {
    return { items: this.docs, total: this.docs.length };
  }

  // Helpers for tests
  getDocs(): InvoiceResponse[] {
    return [...this.docs];
  }
  reset(): void {
    this.docs.length = 0;
    this.customers.clear();
    this.suppliers.clear();
    this.nextDocNum = 1000;
    this.allocCounter = 100_000;
  }
}
