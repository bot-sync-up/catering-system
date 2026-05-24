/**
 * Base adapter - לוגיקה משותפת לכל ספקי החשבוניות
 */

import {
  AllocationNumberRequest,
  AllocationNumberResponse,
  Customer,
  IntegrationProvider,
  InvoiceInput,
  InvoiceInputSchema,
  InvoiceOutput,
  PaginatedResult,
  ProviderName,
  TransactionFilter,
  VATReport,
  VATReportRequest,
} from '../types';

export abstract class BaseAdapter implements IntegrationProvider {
  abstract readonly name: ProviderName;

  abstract createInvoice(input: InvoiceInput): Promise<InvoiceOutput>;
  abstract createReceipt(input: InvoiceInput): Promise<InvoiceOutput>;
  abstract createQuote(input: InvoiceInput): Promise<InvoiceOutput>;
  abstract getAllocationNumber(req: AllocationNumberRequest): Promise<AllocationNumberResponse>;
  abstract getVATReport(req: VATReportRequest): Promise<VATReport>;
  abstract listTransactions(
    filter: TransactionFilter,
  ): Promise<PaginatedResult<InvoiceOutput>>;
  abstract syncCustomer(customer: Customer): Promise<Customer>;
  abstract cancelDocument(documentId: string, reason?: string): Promise<InvoiceOutput>;

  protected validateInput(input: InvoiceInput): InvoiceInput {
    return InvoiceInputSchema.parse(input);
  }

  protected calculateTotals(items: InvoiceInput['items']): {
    netTotal: number;
    vatTotal: number;
    grandTotal: number;
  } {
    let netTotal = 0;
    let vatTotal = 0;
    for (const item of items) {
      const lineNet = item.totalPrice ?? item.quantity * item.unitPrice;
      netTotal += lineNet;
      vatTotal += lineNet * (item.vatRate / 100);
    }
    return {
      netTotal: Math.round(netTotal * 100) / 100,
      vatTotal: Math.round(vatTotal * 100) / 100,
      grandTotal: Math.round((netTotal + vatTotal) * 100) / 100,
    };
  }
}
