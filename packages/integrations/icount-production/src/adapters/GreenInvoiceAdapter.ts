/**
 * GreenInvoiceAdapter — fallback ראשי כש-iCount לא זמין
 * תוכנה מאושרת מס' 1346 גם היא רלוונטית (חתימה זהה).
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

export interface GreenInvoiceCredentials {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
}

export class GreenInvoiceAdapter implements IBillingAdapter {
  readonly providerName = 'greeninvoice' as const;
  private readonly http: AxiosInstance;
  private token?: string;

  constructor(private readonly creds: GreenInvoiceCredentials) {
    this.http = axios.create({
      baseURL: creds.baseUrl ?? 'https://api.greeninvoice.co.il/api/v1',
      timeout: 30_000,
    });
  }

  private async ensureAuth(): Promise<void> {
    if (this.token) return;
    const { data } = await this.http.post<{ token: string }>('/account/token', {
      id: this.creds.apiKey,
      secret: this.creds.apiSecret,
    });
    this.token = data.token;
    this.http.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.ensureAuth();
      const { status } = await this.http.get('/account');
      return status === 200;
    } catch {
      return false;
    }
  }

  private mapDoctype(doctype: DocumentType): number {
    const map: Record<string, number> = {
      [DocumentType.INVOICE]: 305,
      [DocumentType.TAX_INVOICE]: 320,
      [DocumentType.TAX_INVOICE_RECEIPT]: 320,
      [DocumentType.RECEIPT]: 400,
      [DocumentType.QUOTE]: 10,
      [DocumentType.CREDIT_NOTE]: 330,
    };
    return map[doctype] ?? 305;
  }

  async createInvoice(req: InvoiceRequest): Promise<InvoiceResponse> {
    await this.ensureAuth();
    const payload = {
      type: this.mapDoctype(req.doctype),
      client: { name: req.client_name, emails: req.client_email ? [req.client_email] : [], taxId: req.vat_id },
      income: req.items.map(i => ({
        description: i.description,
        quantity: i.quantity,
        price: i.unitprice,
        vatType: i.vat ?? 1,
      })),
      lang: req.lang ?? 'he',
      currency: req.currency_code ?? 'ILS',
      remarks: req.description,
      ...(req.allocation_num && { allocationNum: req.allocation_num }),
    };
    const { data } = await this.http.post<{ id: string; number?: string; url?: { he?: string } }>(
      '/documents',
      payload,
    );
    return {
      status: true,
      doc_num: data.number ? parseInt(data.number, 10) : undefined,
      docnum: data.number,
      doc_id: undefined,
      doc_url: data.url?.he,
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
    await this.ensureAuth();
    const id = params.doc_id ?? params.docnum;
    await this.http.post(`/documents/${id}/cancel`, { reason: params.reason });
    return { status: true };
  }

  async getAllocationNumber(req: AllocationRequest): Promise<AllocationResponse> {
    await this.ensureAuth();
    const { data } = await this.http.post<{ allocationNum: string; status: string }>(
      '/allocations',
      req as unknown as Record<string, unknown>,
    );
    return {
      allocation_num: data.allocationNum,
      status: (data.status as AllocationResponse['status']) ?? 'approved',
    };
  }

  async syncCustomer(c: Customer) {
    await this.ensureAuth();
    const { data } = await this.http.post<{ id: string }>('/clients', c);
    return { status: true, client_id: data.id };
  }
  async syncSupplier(s: Supplier) {
    await this.ensureAuth();
    const { data } = await this.http.post<{ id: string }>('/suppliers', s);
    return { status: true, supplier_id: data.id };
  }
  async listTransactions(params: {
    from: string;
    to: string;
    doctype?: DocumentType;
    page?: number;
    limit?: number;
  }) {
    await this.ensureAuth();
    const { data } = await this.http.post<{ items: unknown[]; total: number }>(
      '/documents/search',
      {
        fromDate: params.from,
        toDate: params.to,
        page: params.page ?? 1,
        pageSize: params.limit ?? 100,
      },
    );
    return data;
  }
}
