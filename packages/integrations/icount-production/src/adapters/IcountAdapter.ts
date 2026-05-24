/**
 * IcountAdapter — wrapper של IcountClient לממשק IBillingAdapter
 */

import { IBillingAdapter } from './IBillingAdapter';
import { IcountClient } from '../IcountClient';
import {
  InvoiceRequest,
  InvoiceResponse,
  AllocationRequest,
  AllocationResponse,
  Customer,
  Supplier,
  DocumentType,
} from '../types';

export class IcountAdapter implements IBillingAdapter {
  readonly providerName = 'icount' as const;

  constructor(private readonly client: IcountClient) {}

  async isHealthy(): Promise<boolean> {
    return this.client.ping();
  }

  createInvoice(req: InvoiceRequest): Promise<InvoiceResponse> {
    return this.client.createInvoice(req);
  }
  createTaxInvoice(req: Omit<InvoiceRequest, 'doctype'>): Promise<InvoiceResponse> {
    return this.client.createTaxInvoice(req);
  }
  createReceipt(req: Omit<InvoiceRequest, 'doctype'>): Promise<InvoiceResponse> {
    return this.client.createReceipt(req);
  }
  createQuote(req: Omit<InvoiceRequest, 'doctype'>): Promise<InvoiceResponse> {
    return this.client.createQuote(req);
  }
  createCreditNote(req: Omit<InvoiceRequest, 'doctype'>): Promise<InvoiceResponse> {
    return this.client.createCreditNote(req);
  }
  cancelDocument(params: { doc_id?: number; docnum?: string; reason: string }) {
    return this.client.cancelDocument(params);
  }
  getAllocationNumber(req: AllocationRequest): Promise<AllocationResponse> {
    return this.client.getAllocationNumber(req);
  }
  syncCustomer(c: Customer) {
    return this.client.syncCustomer(c);
  }
  syncSupplier(s: Supplier) {
    return this.client.syncSupplier(s);
  }
  listTransactions(params: {
    from: string;
    to: string;
    doctype?: DocumentType;
    page?: number;
    limit?: number;
  }) {
    return this.client.listTransactions(params);
  }
}
