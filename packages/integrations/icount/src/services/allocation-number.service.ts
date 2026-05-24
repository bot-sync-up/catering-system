/**
 * Allocation Number Service - שירות מספרי הקצאה
 *
 * מודל ישראל - דרישות רשות המסים:
 * - חובה לחשבונית מס שסכומה הכולל (כולל מע"מ) עולה על 5,000 ש"ח (החל מ-2024)
 * - הסף יורד הדרגתית: 2025 = 20,000, 2026 = 10,000, 2027 = 5,000 (לא כולל מע"מ)
 * - המספר מונפק על ידי שע"מ דרך ספק מאושר (כמו iCount, מאושר 1346)
 * - ללא מספר הקצאה - הקבלה אינה מהווה תיעוד פנים
 */

import {
  AllocationNumberError,
  AllocationNumberRequest,
  AllocationNumberResponse,
  DocumentType,
} from '../types';
import { RestClient } from '../client/rest-client';
import { createLogger } from '../utils/logger';

const log = createLogger('allocation-number');

// סף נדרש למספר הקצאה (לפי שנת המס) - בש"ח, לא כולל מע"מ
const ALLOCATION_THRESHOLDS: Record<number, number> = {
  2024: 25_000,
  2025: 20_000,
  2026: 10_000,
  2027: 5_000,
};

export interface AllocationServiceOptions {
  client: RestClient;
}

export class AllocationNumberService {
  constructor(private readonly opts: AllocationServiceOptions) {}

  /**
   * בדיקה האם נדרש מספר הקצאה לפי שנת המס והסכום
   */
  static isAllocationNumberRequired(
    documentType: DocumentType,
    netAmount: number,
    issueDate: string | Date = new Date(),
  ): boolean {
    // חשבונית מס בלבד נדרשת
    const requiringTypes: DocumentType[] = [
      DocumentType.TAX_INVOICE,
      DocumentType.INVOICE_RECEIPT,
      DocumentType.INVOICE,
    ];
    if (!requiringTypes.includes(documentType)) {
      return false;
    }

    const date = typeof issueDate === 'string' ? new Date(issueDate) : issueDate;
    const year = date.getFullYear();
    const threshold = ALLOCATION_THRESHOLDS[year] ?? ALLOCATION_THRESHOLDS[2024];
    return netAmount >= threshold;
  }

  /**
   * הנפקת מספר הקצאה מול שע"מ דרך iCount
   */
  async issue(req: AllocationNumberRequest): Promise<AllocationNumberResponse> {
    log.info(
      { documentType: req.documentType, totalAmount: req.totalAmount },
      'requesting allocation number',
    );

    // ולידציה
    if (!req.totalAmount || req.totalAmount <= 0) {
      throw new AllocationNumberError('Total amount must be positive');
    }
    if (!req.issueDate) {
      throw new AllocationNumberError('Issue date is required');
    }

    try {
      const response = await this.opts.client.post<AllocationNumberApiResponse>(
        '/allocation_number/get',
        {
          doc_type: this.mapDocumentType(req.documentType),
          doc_id: req.documentId,
          total_amount: req.totalAmount,
          vat_amount: req.vatAmount,
          customer_tax_id: req.customerTaxId,
          issue_date: this.formatDate(req.issueDate),
        },
      );

      if (!response.status || !response.allocation_number) {
        throw new AllocationNumberError(
          response.error ?? 'Failed to issue allocation number',
          response,
        );
      }

      const result: AllocationNumberResponse = {
        allocationNumber: response.allocation_number,
        issuedAt: response.issued_at ?? new Date().toISOString(),
        expiresAt: response.expires_at,
        isValid: true,
        signature: response.signature,
        raw: response,
      };

      log.info(
        { allocationNumber: result.allocationNumber },
        'allocation number issued',
      );
      return result;
    } catch (err) {
      if (err instanceof AllocationNumberError) throw err;
      throw new AllocationNumberError(
        `Failed to issue allocation number: ${(err as Error).message}`,
        err,
      );
    }
  }

  /**
   * ולידציה של מספר הקצאה מול שע"מ
   */
  async validate(allocationNumber: string): Promise<boolean> {
    if (!allocationNumber || allocationNumber.trim().length === 0) {
      return false;
    }
    try {
      const response = await this.opts.client.post<{ valid: boolean }>(
        '/allocation_number/validate',
        { allocation_number: allocationNumber },
      );
      return response.valid === true;
    } catch (err) {
      log.warn({ err: (err as Error).message }, 'allocation validation failed');
      return false;
    }
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

  private formatDate(date: string | Date): string {
    if (typeof date === 'string') return date;
    return date.toISOString().slice(0, 10);
  }
}

interface AllocationNumberApiResponse {
  status: boolean;
  allocation_number?: string;
  issued_at?: string;
  expires_at?: string;
  signature?: string;
  error?: string;
}
