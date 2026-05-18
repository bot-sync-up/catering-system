/**
 * RivhitAdapter — fallback שני
 * חב' רווחית — ספק חשבוניות ישראלי נוסף
 */

import axios, { AxiosInstance } from 'axios';
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

export interface RivhitCredentials {
  apiToken: string;
  baseUrl?: string;
}

export class RivhitAdapter implements IBillingAdapter {
  readonly providerName = 'rivhit' as const;
  private readonly http: AxiosInstance;

  constructor(creds: RivhitCredentials) {
    this.http = axios.create({
      baseURL: creds.baseUrl ?? 'https://api.rivhit.co.il/online/RivhitOnlineAPI.svc',
      timeout: 30_000,
      headers: {
        'Authorization': `Bearer ${creds.apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async isHealthy(): Promise<boolean> {
    try {
      const { status } = await this.http.post('/Account.Connect', {});
      return status === 200;
    } catch {
      return false;
    }
  }

  private mapDoctype(doctype: DocumentType): number {
    const map: Record<string, number> = {
      [DocumentType.INVOICE]: 1,
      [DocumentType.TAX_INVOICE]: 2,
      [DocumentType.TAX_INVOICE_RECEIPT]: 3,
      [DocumentType.RECEIPT]: 7,
      [DocumentType.QUOTE]: 10,
      [DocumentType.CREDIT_NOTE]: 4,
    };
    return map[doctype] ?? 2;
  }

  async createInvoice(req: InvoiceRequest): Promise<InvoiceResponse> {
    const payload = {
      document_type: this.mapDoctype(req.doctype),
      customer_name: req.client_name,
      customer_email: req.client_email,
      customer_id_number: req.vat_id,
      items: req.items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        price_nis: i.unitprice,
      })),
      allocation_number: req.allocation_num,
    };
    const { data } = await this.http.post<{ document_number: number; document_link?: string }>(
      '/Document.New',
      payload,
    );
    return {
      status: true,
      doc_num: data.document_number,
      doc_url: data.document_link,
      allocation_num: req.allocation_num,
    };
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

  async cancelDocument(params: { doc_id?: number; docnum?: string; reason: string }) {
    await this.http.post('/Document.Cancel', {
      document_number: params.doc_id ?? parseInt(params.docnum ?? '0', 10),
      cancel_reason: params.reason,
    });
    return { status: true };
  }

  async getAllocationNumber(req: AllocationRequest): Promise<AllocationResponse> {
    const { data } = await this.http.post<{ allocation_number: string; status: string }>(
      '/Allocation.Request',
      req as unknown as Record<string, unknown>,
    );
    return {
      allocation_num: data.allocation_number,
      status: (data.status as AllocationResponse['status']) ?? 'approved',
    };
  }

  async syncCustomer(c: Customer) {
    const { data } = await this.http.post<{ customer_id: string }>('/Customer.Update', c);
    return { status: true, client_id: data.customer_id };
  }
  async syncSupplier(s: Supplier) {
    const { data } = await this.http.post<{ supplier_id: string }>('/Supplier.Update', s);
    return { status: true, supplier_id: data.supplier_id };
  }
  async listTransactions(params: {
    from: string;
    to: string;
    doctype?: DocumentType;
    page?: number;
    limit?: number;
  }) {
    const { data } = await this.http.post<{ items: unknown[]; total: number }>(
      '/Document.List',
      {
        from_date: params.from,
        to_date: params.to,
        page: params.page ?? 1,
        page_size: params.limit ?? 100,
      },
    );
    return data;
  }
}
