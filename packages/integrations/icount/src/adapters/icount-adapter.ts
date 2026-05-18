/**
 * iCount adapter - הספק העיקרי
 * תוכנה מאושרת רשות המסים מספר 1346
 */

import { v4 as uuidv4 } from 'uuid';

import { BaseAdapter } from './base-adapter';
import { RestClient } from '../client/rest-client';
import { AllocationNumberService } from '../services/allocation-number.service';
import { VATReportService } from '../services/vat-report.service';
import { CustomerSyncService } from '../services/customer-sync.service';
import {
  AllocationNumberRequest,
  AllocationNumberResponse,
  Customer,
  DocumentStatus,
  DocumentType,
  InvoiceInput,
  InvoiceOutput,
  PaginatedResult,
  ProviderName,
  TransactionFilter,
  VATReport,
  VATReportRequest,
} from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('icount-adapter');

export interface ICountAdapterServices {
  client: RestClient;
  allocationService?: AllocationNumberService;
  vatReportService?: VATReportService;
  customerSync?: CustomerSyncService;
}

export class ICountAdapter extends BaseAdapter {
  readonly name = ProviderName.ICOUNT;

  private readonly client: RestClient;
  private readonly allocationService: AllocationNumberService;
  private readonly vatReportService: VATReportService;
  private readonly customerSync: CustomerSyncService;

  constructor(services: ICountAdapterServices) {
    super();
    this.client = services.client;
    this.allocationService = services.allocationService
      ?? new AllocationNumberService({ client: this.client });
    this.vatReportService = services.vatReportService ?? new VATReportService(this.client);
    this.customerSync = services.customerSync ?? new CustomerSyncService(this.client);
  }

  async createInvoice(input: InvoiceInput): Promise<InvoiceOutput> {
    const validated = this.validateInput(input);
    const totals = this.calculateTotals(validated.items);

    log.info(
      { type: validated.type, total: totals.grandTotal },
      'creating invoice',
    );

    // Sync customer first if provided
    let customer = validated.customer;
    if (customer) {
      customer = await this.customerSync.sync(customer);
    }

    // Allocation number - אם נדרש
    let allocationNumber: string | undefined;
    if (
      AllocationNumberService.isAllocationNumberRequired(
        validated.type,
        totals.netTotal,
        validated.issueDate ?? new Date(),
      )
    ) {
      const alloc = await this.allocationService.issue({
        documentType: validated.type,
        totalAmount: totals.grandTotal,
        vatAmount: totals.vatTotal,
        customerTaxId: customer?.taxId,
        issueDate: this.formatDate(validated.issueDate ?? new Date()),
      });
      allocationNumber = alloc.allocationNumber;
    }

    const response = await this.client.post<ICountDocResponse>('/doc/create', {
      doctype: this.mapDocumentType(validated.type),
      client_id: customer?.id,
      client_name: customer?.name,
      vat_id: customer?.taxId,
      email: customer?.email,
      lang: validated.language,
      currency_code: validated.currency,
      items: validated.items.map((it) => ({
        description: it.description,
        unitprice_incvat: it.unitPrice,
        quantity: it.quantity,
        vat_type: it.vatType,
        catalog_number: it.catalogNumber,
      })),
      send_email: validated.sendByEmail,
      doc_notes: validated.notes,
      reference: validated.reference,
      allocation_number: allocationNumber,
      issue_date: this.formatDate(validated.issueDate ?? new Date()),
    });

    return this.mapResponse(response, validated, customer, allocationNumber);
  }

  async createReceipt(input: InvoiceInput): Promise<InvoiceOutput> {
    return this.createInvoice({ ...input, type: DocumentType.RECEIPT });
  }

  async createQuote(input: InvoiceInput): Promise<InvoiceOutput> {
    return this.createInvoice({ ...input, type: DocumentType.QUOTE });
  }

  async getAllocationNumber(
    req: AllocationNumberRequest,
  ): Promise<AllocationNumberResponse> {
    return this.allocationService.issue(req);
  }

  async getVATReport(req: VATReportRequest): Promise<VATReport> {
    return this.vatReportService.generate(req);
  }

  async listTransactions(
    filter: TransactionFilter,
  ): Promise<PaginatedResult<InvoiceOutput>> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 50;

    const response = await this.client.post<ICountListResponse>('/doc/list', {
      from_date: filter.fromDate,
      to_date: filter.toDate,
      doctype: filter.documentType ? this.mapDocumentType(filter.documentType) : undefined,
      client_id: filter.customerId,
      min_amount: filter.minAmount,
      max_amount: filter.maxAmount,
      page,
      page_size: pageSize,
    });

    const docs = response.docs ?? [];
    const total = response.total ?? docs.length;

    return {
      data: docs.map((d) => this.mapListItem(d)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async syncCustomer(customer: Customer): Promise<Customer> {
    return this.customerSync.sync(customer);
  }

  async cancelDocument(documentId: string, reason?: string): Promise<InvoiceOutput> {
    log.info({ documentId, reason }, 'cancelling document');
    const response = await this.client.post<ICountDocResponse>('/doc/cancel', {
      doc_id: documentId,
      cancel_reason: reason,
    });

    return {
      id: documentId,
      documentNumber: response.doc_number ?? documentId,
      type: this.reverseMapDocType(response.doctype ?? 'invoice'),
      status: DocumentStatus.CANCELLED,
      totalAmount: 0,
      vatAmount: 0,
      netAmount: 0,
      currency: 'ILS',
      issueDate: response.issue_date ?? new Date().toISOString(),
      customer: { name: '' },
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      raw: response,
    };
  }

  // ================================
  // Internal mapping helpers
  // ================================

  private mapResponse(
    response: ICountDocResponse,
    input: InvoiceInput,
    customer: Customer | undefined,
    allocationNumber: string | undefined,
  ): InvoiceOutput {
    const totals = this.calculateTotals(input.items);
    return {
      id: response.doc_id ?? uuidv4(),
      documentNumber: response.doc_number ?? '',
      type: input.type,
      status: DocumentStatus.ISSUED,
      allocationNumber: allocationNumber ?? response.allocation_number,
      totalAmount: totals.grandTotal,
      vatAmount: totals.vatTotal,
      netAmount: totals.netTotal,
      currency: input.currency,
      issueDate: this.formatDate(input.issueDate ?? new Date()),
      pdfUrl: response.pdf_url,
      customer: customer ?? input.customer ?? { name: '' },
      items: input.items,
      payments: input.payments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      raw: response,
    };
  }

  private mapListItem(d: ICountDocSummary): InvoiceOutput {
    return {
      id: d.doc_id,
      documentNumber: d.doc_number,
      type: this.reverseMapDocType(d.doctype),
      status: this.reverseMapStatus(d.status),
      allocationNumber: d.allocation_number,
      totalAmount: Number(d.total_amount ?? 0),
      vatAmount: Number(d.vat_amount ?? 0),
      netAmount: Number(d.net_amount ?? 0),
      currency: d.currency_code ?? 'ILS',
      issueDate: d.issue_date,
      pdfUrl: d.pdf_url,
      customer: { name: d.client_name ?? '', taxId: d.vat_id },
      items: [],
      createdAt: d.created_at ?? d.issue_date,
      updatedAt: d.updated_at ?? d.issue_date,
      raw: d,
    };
  }

  private mapDocumentType(type: DocumentType): string {
    const map: Record<DocumentType, string> = {
      [DocumentType.INVOICE]: 'invoice',
      [DocumentType.TAX_INVOICE]: 'tax_invoice',
      [DocumentType.INVOICE_RECEIPT]: 'invrec',
      [DocumentType.RECEIPT]: 'receipt',
      [DocumentType.CREDIT_NOTE]: 'credit',
      [DocumentType.QUOTE]: 'quote',
      [DocumentType.ORDER]: 'order',
      [DocumentType.DELIVERY_NOTE]: 'delivery',
      [DocumentType.PROFORMA]: 'proforma',
    };
    return map[type] ?? 'invoice';
  }

  private reverseMapDocType(type: string): DocumentType {
    const map: Record<string, DocumentType> = {
      invoice: DocumentType.INVOICE,
      tax_invoice: DocumentType.TAX_INVOICE,
      invrec: DocumentType.INVOICE_RECEIPT,
      receipt: DocumentType.RECEIPT,
      credit: DocumentType.CREDIT_NOTE,
      quote: DocumentType.QUOTE,
      order: DocumentType.ORDER,
      delivery: DocumentType.DELIVERY_NOTE,
      proforma: DocumentType.PROFORMA,
    };
    return map[type] ?? DocumentType.INVOICE;
  }

  private reverseMapStatus(status?: string): DocumentStatus {
    if (!status) return DocumentStatus.ISSUED;
    const map: Record<string, DocumentStatus> = {
      draft: DocumentStatus.DRAFT,
      issued: DocumentStatus.ISSUED,
      cancelled: DocumentStatus.CANCELLED,
      paid: DocumentStatus.PAID,
      overdue: DocumentStatus.OVERDUE,
    };
    return map[status.toLowerCase()] ?? DocumentStatus.ISSUED;
  }

  private formatDate(date: string | Date): string {
    if (typeof date === 'string') return date;
    return date.toISOString().slice(0, 10);
  }
}

interface ICountDocResponse {
  doc_id?: string;
  doc_number?: string;
  doctype?: string;
  pdf_url?: string;
  allocation_number?: string;
  issue_date?: string;
}

interface ICountDocSummary {
  doc_id: string;
  doc_number: string;
  doctype: string;
  status?: string;
  allocation_number?: string;
  total_amount?: number;
  vat_amount?: number;
  net_amount?: number;
  currency_code?: string;
  issue_date: string;
  pdf_url?: string;
  client_name?: string;
  vat_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface ICountListResponse {
  docs?: ICountDocSummary[];
  total?: number;
}
