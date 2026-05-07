/**
 * GreenInvoice (חשבונית ירוקה) adapter
 * https://www.greeninvoice.co.il/api-docs
 *
 * Stub - מימוש דמה ל-API של GreenInvoice עם אותו interface.
 * הפעלה אמיתית תדרוש OAuth2 token + endpoints של GreenInvoice.
 */

import { v4 as uuidv4 } from 'uuid';

import { BaseAdapter } from './base-adapter';
import { RestClient } from '../client/rest-client';
import {
  AllocationNumberError,
  AllocationNumberRequest,
  AllocationNumberResponse,
  Customer,
  DocumentStatus,
  ICountConfig,
  InvoiceInput,
  InvoiceOutput,
  PaginatedResult,
  ProviderName,
  TransactionFilter,
  VATReport,
  VATReportRequest,
} from '../types';

export interface GreenInvoiceConfig extends ICountConfig {
  apiSecret?: string;
}

export class GreenInvoiceAdapter extends BaseAdapter {
  readonly name = ProviderName.GREEN_INVOICE;

  private readonly client: RestClient;

  constructor(config: GreenInvoiceConfig) {
    super();
    this.client = new RestClient({
      ...config,
      baseUrl: config.baseUrl ?? 'https://api.greeninvoice.co.il/api/v1',
    });
  }

  async createInvoice(input: InvoiceInput): Promise<InvoiceOutput> {
    const validated = this.validateInput(input);
    const totals = this.calculateTotals(validated.items);

    const response = await this.client.post<{ id: string; number: string; url: string }>(
      '/documents',
      {
        type: this.mapType(validated.type),
        client: {
          name: validated.customer?.name,
          taxId: validated.customer?.taxId,
          email: validated.customer?.email,
        },
        items: validated.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          price: it.unitPrice,
          vatType: it.vatType,
        })),
        currency: validated.currency,
        lang: validated.language,
      },
    );

    return {
      id: response.id ?? uuidv4(),
      documentNumber: response.number ?? '',
      type: validated.type,
      status: DocumentStatus.ISSUED,
      totalAmount: totals.grandTotal,
      vatAmount: totals.vatTotal,
      netAmount: totals.netTotal,
      currency: validated.currency,
      issueDate: typeof validated.issueDate === 'string'
        ? validated.issueDate
        : new Date().toISOString().slice(0, 10),
      pdfUrl: response.url,
      customer: validated.customer ?? { name: '' },
      items: validated.items,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async createReceipt(input: InvoiceInput): Promise<InvoiceOutput> {
    return this.createInvoice(input);
  }

  async createQuote(input: InvoiceInput): Promise<InvoiceOutput> {
    return this.createInvoice(input);
  }

  async getAllocationNumber(
    _req: AllocationNumberRequest,
  ): Promise<AllocationNumberResponse> {
    throw new AllocationNumberError(
      'Allocation numbers via GreenInvoice require dedicated endpoint - use ICountAdapter or implement /tax-allocation flow',
    );
  }

  async getVATReport(_req: VATReportRequest): Promise<VATReport> {
    throw new Error('GreenInvoice VAT report endpoint not implemented in this stub');
  }

  async listTransactions(
    filter: TransactionFilter,
  ): Promise<PaginatedResult<InvoiceOutput>> {
    return {
      data: [],
      page: filter.page ?? 1,
      pageSize: filter.pageSize ?? 50,
      total: 0,
      totalPages: 0,
    };
  }

  async syncCustomer(customer: Customer): Promise<Customer> {
    const response = await this.client.post<{ id: string }>('/clients', {
      name: customer.name,
      taxId: customer.taxId,
      email: customer.email,
      phone: customer.phone,
    });
    return { ...customer, id: response.id };
  }

  async cancelDocument(documentId: string, reason?: string): Promise<InvoiceOutput> {
    await this.client.post(`/documents/${documentId}/cancel`, { reason });
    return {
      id: documentId,
      documentNumber: documentId,
      type: 'invoice' as never,
      status: DocumentStatus.CANCELLED,
      totalAmount: 0,
      vatAmount: 0,
      netAmount: 0,
      currency: 'ILS',
      issueDate: new Date().toISOString(),
      customer: { name: '' },
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private mapType(type: string): number {
    const map: Record<string, number> = {
      invoice: 305,
      tax_invoice: 320,
      invoice_receipt: 320,
      receipt: 400,
      credit_note: 330,
      quote: 100,
    };
    return map[type] ?? 305;
  }
}
