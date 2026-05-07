/**
 * VAT Report Service - שירות דוחות מע"מ
 *
 * תומך בפורמט PCN874 - הפורמט הרשמי של רשות המסים בישראל
 * https://www.gov.il/he/departments/general/uniform_export_format
 */

import {
  DocumentType,
  ICountValidationError,
  VATReport,
  VATReportLine,
  VATReportRequest,
} from '../types';
import { RestClient } from '../client/rest-client';
import { createLogger } from '../utils/logger';

const log = createLogger('vat-report');

export class VATReportService {
  constructor(private readonly client: RestClient) {}

  async generate(req: VATReportRequest): Promise<VATReport> {
    if (!req.fromDate || !req.toDate) {
      throw new ICountValidationError('fromDate and toDate are required');
    }

    log.info({ from: req.fromDate, to: req.toDate }, 'generating VAT report');

    const response = await this.client.post<VATReportApiResponse>('/reports/vat', {
      from_date: req.fromDate,
      to_date: req.toDate,
      report_type: req.reportType ?? 'monthly',
      format: req.format ?? 'json',
    });

    const lines: VATReportLine[] = (response.lines ?? []).map((line) => ({
      date: line.date,
      documentNumber: line.doc_number,
      documentType: this.mapDocType(line.doc_type),
      customerTaxId: line.customer_tax_id,
      customerName: line.customer_name ?? '',
      netAmount: Number(line.net_amount ?? 0),
      vatAmount: Number(line.vat_amount ?? 0),
      totalAmount: Number(line.total_amount ?? 0),
      allocationNumber: line.allocation_number,
    }));

    const report: VATReport = {
      fromDate: req.fromDate,
      toDate: req.toDate,
      totalSales: Number(response.total_sales ?? 0),
      totalVAT: Number(response.total_vat ?? 0),
      totalNet: Number(response.total_net ?? 0),
      totalRefunds: Number(response.total_refunds ?? 0),
      vatToPay: Number(response.vat_to_pay ?? 0),
      documentCount: lines.length,
      lines,
      generatedAt: new Date().toISOString(),
    };

    if (req.format === 'pcn874') {
      report.pcn874Format = response.pcn874 ?? this.formatAsPCN874(report);
    }

    return report;
  }

  /**
   * הפקת דוח בפורמט PCN874 (Uniform structured file - מבנה אחיד)
   * הפורמט נדרש על ידי רשות המסים לדיווח מקוון
   */
  formatAsPCN874(report: VATReport): string {
    const lines: string[] = [];

    // Header (A) - רשומת פתיחה
    const header = [
      'A',
      this.padDate(report.fromDate),
      this.padDate(report.toDate),
      this.padNumber(report.documentCount, 9),
      this.padAmount(report.totalSales),
      this.padAmount(report.totalVAT),
    ].join('|');
    lines.push(header);

    // Body (B) - רשומות פירוט
    for (const line of report.lines) {
      const detail = [
        'B',
        this.padDate(line.date),
        line.documentNumber,
        this.mapDocTypeToPCN(line.documentType),
        line.customerTaxId ?? '',
        this.padAmount(line.netAmount),
        this.padAmount(line.vatAmount),
        line.allocationNumber ?? '',
      ].join('|');
      lines.push(detail);
    }

    // Footer (Z) - רשומת סיכום
    const footer = [
      'Z',
      this.padNumber(report.documentCount, 9),
      this.padAmount(report.totalNet),
      this.padAmount(report.totalVAT),
      this.padAmount(report.totalSales),
    ].join('|');
    lines.push(footer);

    return lines.join('\n');
  }

  private mapDocType(type: string): DocumentType {
    const reverseMap: Record<string, DocumentType> = {
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
    return reverseMap[type] ?? DocumentType.INVOICE;
  }

  private mapDocTypeToPCN(type: DocumentType): string {
    const map: Record<DocumentType, string> = {
      [DocumentType.INVOICE]: '305',
      [DocumentType.TAX_INVOICE]: '320',
      [DocumentType.INVOICE_RECEIPT]: '320',
      [DocumentType.RECEIPT]: '400',
      [DocumentType.CREDIT_NOTE]: '330',
      [DocumentType.QUOTE]: '100',
      [DocumentType.ORDER]: '200',
      [DocumentType.DELIVERY_NOTE]: '300',
      [DocumentType.PROFORMA]: '210',
    };
    return map[type] ?? '305';
  }

  private padDate(date: string): string {
    // YYYYMMDD
    return date.replace(/-/g, '').slice(0, 8);
  }

  private padNumber(num: number, width: number): string {
    return String(num).padStart(width, '0');
  }

  private padAmount(amount: number): string {
    // Israeli tax authority - amount in agorot (cents), no decimal
    return String(Math.round(amount * 100)).padStart(15, '0');
  }
}

interface VATReportApiResponse {
  total_sales?: number;
  total_vat?: number;
  total_net?: number;
  total_refunds?: number;
  vat_to_pay?: number;
  pcn874?: string;
  lines?: Array<{
    date: string;
    doc_number: string;
    doc_type: string;
    customer_tax_id?: string;
    customer_name?: string;
    net_amount?: number;
    vat_amount?: number;
    total_amount?: number;
    allocation_number?: string;
  }>;
}
