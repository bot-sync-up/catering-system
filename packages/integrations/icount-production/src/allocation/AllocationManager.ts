/**
 * AllocationManager — ניהול מספרי הקצאה לחשבוניות
 * לפי מודל ישראל (Israel Model) של רשות המסים
 *
 * הספים לפי שנה:
 *   2024 — 25,000  ₪
 *   2025 — 20,000  ₪
 *   2026 — 10,000  ₪
 *   2027 —  5,000  ₪
 *
 * חשבוניות שעוברות את הסף חייבות לקבל מספר הקצאה
 * מרשות המסים לפני הנפקתן.
 *
 * מקור: חוק לצמצום השימוש במזומן + תיקון חוק העוסקים.
 * תוכנה מאושרת מס' 1346.
 */

import { IcountClient } from '../IcountClient';
import {
  AllocationRequest,
  AllocationResponse,
  DocumentType,
  Logger,
} from '../types';

export const ALLOCATION_THRESHOLDS_ILS: Record<number, number> = {
  2024: 25_000,
  2025: 20_000,
  2026: 10_000,
  2027: 5_000,
};

/**
 * המוסמכים לקבל מספר הקצאה
 * (חשבוניות מס וזיכוי)
 */
const REQUIRES_ALLOCATION_DOCTYPES: ReadonlySet<DocumentType> = new Set<DocumentType>([
  DocumentType.TAX_INVOICE,
  DocumentType.TAX_INVOICE_RECEIPT,
  DocumentType.CREDIT_NOTE,
  DocumentType.TAX_INVOICE_REFUND,
]);

export interface AllocationManagerOptions {
  client: IcountClient;
  logger?: Logger;
  /** מאפשר override על הספים — לבדיקות */
  thresholds?: Record<number, number>;
}

export class AllocationRequiredError extends Error {
  constructor(message: string, public details: { amount: number; threshold: number; year: number }) {
    super(message);
    this.name = 'AllocationRequiredError';
  }
}

export class AllocationManager {
  private readonly client: IcountClient;
  private readonly logger?: Logger;
  private readonly thresholds: Record<number, number>;

  /** Cache למניעת בקשות כפולות */
  private readonly cache = new Map<string, AllocationResponse>();

  constructor(opts: AllocationManagerOptions) {
    this.client = opts.client;
    this.logger = opts.logger;
    this.thresholds = opts.thresholds ?? ALLOCATION_THRESHOLDS_ILS;
  }

  /**
   * מחזיר את הסף לפי שנה.
   * אם השנה לא מוגדרת — מחזיר את הסף הנמוך ביותר (השמרני).
   */
  getThresholdForYear(year: number): number {
    if (this.thresholds[year] !== undefined) return this.thresholds[year];

    // אם השנה מאוחרת מהמיפוי שלנו — לוקחים את האחרונה
    const years = Object.keys(this.thresholds).map(Number).sort((a, b) => a - b);
    const latest = years[years.length - 1];
    if (year > latest) return this.thresholds[latest];

    // אם מוקדמת — לא נדרש (לפני החוק)
    return Number.POSITIVE_INFINITY;
  }

  /**
   * האם נדרש מספר הקצאה לחשבונית?
   */
  isAllocationRequired(amount: number, year: number, doctype: DocumentType): boolean {
    if (!REQUIRES_ALLOCATION_DOCTYPES.has(doctype)) return false;
    const threshold = this.getThresholdForYear(year);
    return amount >= threshold;
  }

  /**
   * בקשת מספר הקצאה מ-iCount/רשות המסים.
   * מבצע caching לפי מפתח (סכום+ת.ז.+תאריך) למניעת חיובים כפולים.
   */
  async requestAllocationNumber(req: AllocationRequest): Promise<AllocationResponse> {
    const cacheKey = this.cacheKey(req);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.status === 'approved') {
      this.logger?.debug('[Allocation] cache hit', { cacheKey });
      return cached;
    }

    this.logger?.info('[Allocation] requesting', {
      amount: req.amount,
      doctype: req.doctype,
      year: this.parseYear(req.date),
    });

    const resp = await this.client.getAllocationNumber(req);

    if (resp.status === 'approved') {
      this.cache.set(cacheKey, resp);
    }

    if (resp.status === 'rejected') {
      this.logger?.error('[Allocation] rejected', { reason: resp.reason });
    }

    return resp;
  }

  /**
   * Helper — אם נדרש מספר הקצאה, מבקש אותו.
   * אחרת — מחזיר null.
   *
   * זורק שגיאה אם הבקשה נדחתה.
   */
  async assertAllocationIfNeeded(
    amount: number,
    year: number,
    req: Omit<AllocationRequest, 'amount'> & { amount?: number },
  ): Promise<string | null> {
    if (!this.isAllocationRequired(amount, year, req.doctype)) {
      return null;
    }

    const threshold = this.getThresholdForYear(year);
    this.logger?.info('[Allocation] required', { amount, threshold, year });

    const resp = await this.requestAllocationNumber({
      ...req,
      amount,
    });

    if (resp.status === 'rejected') {
      throw new AllocationRequiredError(
        `Allocation rejected: ${resp.reason ?? 'unknown'}`,
        { amount, threshold, year },
      );
    }

    if (resp.status === 'pending') {
      this.logger?.warn('[Allocation] pending', { request_id: resp.request_id });
    }

    return resp.allocation_num;
  }

  private cacheKey(req: AllocationRequest): string {
    return [
      req.amount.toFixed(2),
      req.customer_vat_id ?? 'noid',
      req.customer_name,
      req.doctype,
      req.date,
    ].join('|');
  }

  private parseYear(date: string): number {
    return parseInt(date.slice(0, 4), 10);
  }

  /** ניקוי cache (למשל לטסטים) */
  clearCache(): void {
    this.cache.clear();
  }
}
