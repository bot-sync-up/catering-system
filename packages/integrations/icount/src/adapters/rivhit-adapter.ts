/**
 * Rivhit (ריווחית / Rivhit Online) adapter
 * https://api.rivhit.co.il/online/RivhitOnlineAPI.svc/help
 *
 * Stub - אותו interface עבור Rivhit.
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

export class RivhitAdapter extends BaseAdapter {
  readonly name = ProviderName.RIVHIT;

  private readonly client: RestClient;

  constructor(config: ICountConfig) {
    super();
    this.client = new RestClient({
      ...config,
      baseUrl: config.baseUrl ?? 'https://api.rivhit.co.il/online/RivhitOnlineAPI.svc',
    });
  }

  async createInvoice(input: InvoiceInput): Promise<InvoiceOutput> {
    const validated = this.validateInput(input);
    const totals = this.calculateTotals(validated.items);

    const response = await this.client.post<{ document_id: string; document_number: string }>(
      '/Document.New',
      {
        document_type: this.mapType(validated.type),
        customer_id: validated.customer?.id,
        items: validated.items.map((it) => ({
          item_description: it.description,
          quantity: it.quantity,
          price: it.unitPrice,
        })),
      },
    );

    return {
      id: response.document_id ?? uuidv4(),
      documentNumber: response.document_number ?? '',
      type: validated.type,
      status: DocumentStatus.ISSUED,
      totalAmount: totals.grandTotal,
      vatAmount: totals.vatTotal,
      netAmount: totals.netTotal,
      currency: validated.currency,
      issueDate: typeof validated.issueDate === 'string'
        ? validated.issueDate
        : new Date().toISOString().slice(0, 10),
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
      'Rivhit allocation number flow requires dedicated implementation',
    );
  }

  async getVATReport(_req: VATReportRequest): Promise<VATReport> {
    throw new Error('Rivhit VAT report not implemented in this stub');
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
    const response = await this.client.post<{ customer_id: string }>('/Customer.New', {
      customer_name: customer.name,
      vat_number: customer.taxId,
      email_address: customer.email,
    });
    return { ...customer, id: response.customer_id };
  }

  async cancelDocument(documentId: string, _reason?: string): Promise<InvoiceOutput> {
    await this.client.post('/Document.Cancel', { document_id: documentId });
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
      invoice: 1,
      tax_invoice: 2,
      invoice_receipt: 3,
      receipt: 4,
      credit_note: 5,
      quote: 6,
    };
    return map[type] ?? 1;
  }
}
