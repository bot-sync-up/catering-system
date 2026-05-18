/**
 * migrationHelper.ts
 * ----------------------------------------------------------------------------
 * עוזר Migration - חישוב מחדש של חשבוניות/קבלות לאחר שינוי שיעור מע"מ.
 *
 * תרחיש שימוש:
 *   חשבונית "פתוחה" (טיוטה / לא שולמה) הונפקה בדצמבר 2024 עם מע"מ 17%,
 *   אך תאריך החיוב הסופי הוא ינואר 2025 - יש לעדכן ל-18%.
 *
 * אסטרטגיה: שומר על הסכום ה-net (לפני מע"מ) וקובע מחדש את המע"מ והברוטו.
 * חלופית: getStrategy('preserveGross') - שומר על הברוטו ומקטין/מגדיל את ה-net.
 * ----------------------------------------------------------------------------
 */

import { getVATRate, calcVATAmount } from './vatRate';

export interface InvoiceLineLike {
  /** מזהה שורה (לדיווח שגיאות) */
  id?: string | number;
  /** סכום ללא מע"מ */
  netAmount: number;
  /** סכום המע"מ הנוכחי */
  vatAmount: number;
  /** סכום ברוטו - net + vat */
  grossAmount: number;
  /** שיעור המע"מ הנוכחי (שבר עשרוני) */
  vatRate: number;
}

export interface InvoiceLike {
  id: string | number;
  /** תאריך החשבונית (לקביעת השיעור החדש) */
  invoiceDate: Date;
  /** סטטוס - רק 'open'/'draft' מועברות; closed לא נוגעים */
  status: 'open' | 'draft' | 'closed' | 'paid' | 'cancelled' | string;
  /** שורות החשבונית */
  lines: InvoiceLineLike[];
  /** tenantId לתמיכה ב-multi-tenant */
  tenantId?: string;
}

export type MigrationStrategy = 'preserveNet' | 'preserveGross';

export interface RecomputeOptions {
  /** השיעור הישן הצפוי (לוודא שלא טועים) - אופציונלי */
  oldRate?: number;
  /** השיעור החדש לכפיה - אם לא צוין, נחשב מתוך invoiceDate */
  newRate?: number;
  /** אסטרטגיה. ברירת מחדל preserveNet (משאיר net ומגדיל ברוטו) */
  strategy?: MigrationStrategy;
  /** האם לעדכן גם חשבוניות שכבר נסגרו (לא מומלץ!) */
  includeClosed?: boolean;
}

export interface RecomputeResult {
  invoiceId: string | number;
  changed: boolean;
  /** סיבה אם לא שונתה */
  skipReason?: string;
  oldTotals: { net: number; vat: number; gross: number };
  newTotals: { net: number; vat: number; gross: number };
  oldRate: number;
  newRate: number;
}

/**
 * מחשב מחדש סיכומי חשבונית לאחר שינוי שיעור מע"מ.
 *
 * חשוב: הפונקציה אינה משנה את ה-DB ישירות; היא מחזירה אובייקט "מתוקן"
 * שיש להעביר ל-ORM/repository של היישום.
 *
 * @param invoice החשבונית המקורית (לא מתעדכנת in-place)
 * @param options אפשרויות
 * @returns אובייקט עם invoice חדש + דוח מה השתנה
 */
export function recomputeInvoiceTotals(
  invoice: InvoiceLike,
  options: RecomputeOptions = {}
): { invoice: InvoiceLike; report: RecomputeResult } {
  const strategy: MigrationStrategy = options.strategy ?? 'preserveNet';
  const newRate = options.newRate ?? getVATRate(invoice.invoiceDate, { tenantId: invoice.tenantId });

  // סיכומים ישנים
  const oldNet = sum(invoice.lines, (l) => l.netAmount);
  const oldVat = sum(invoice.lines, (l) => l.vatAmount);
  const oldGross = sum(invoice.lines, (l) => l.grossAmount);
  const oldRate = options.oldRate ?? (invoice.lines[0]?.vatRate ?? 0);

  // בדיקות מנע
  if (!options.includeClosed && (invoice.status === 'closed' || invoice.status === 'paid' || invoice.status === 'cancelled')) {
    return {
      invoice,
      report: {
        invoiceId: invoice.id,
        changed: false,
        skipReason: `חשבונית בסטטוס ${invoice.status} - לא מועברת (השתמש ב-includeClosed=true לכפיה)`,
        oldTotals: { net: oldNet, vat: oldVat, gross: oldGross },
        newTotals: { net: oldNet, vat: oldVat, gross: oldGross },
        oldRate,
        newRate,
      },
    };
  }

  if (Math.abs(oldRate - newRate) < 1e-9) {
    return {
      invoice,
      report: {
        invoiceId: invoice.id,
        changed: false,
        skipReason: 'אין הפרש שיעור - השיעור הישן והחדש זהים',
        oldTotals: { net: oldNet, vat: oldVat, gross: oldGross },
        newTotals: { net: oldNet, vat: oldVat, gross: oldGross },
        oldRate,
        newRate,
      },
    };
  }

  // חישוב מחדש של כל שורה
  const newLines: InvoiceLineLike[] = invoice.lines.map((line) => {
    if (strategy === 'preserveGross') {
      // משמרים את הברוטו: גוזרים את ה-net כלפי מטה כדי שהברוטו יישאר זהה
      const newNet = round2(line.grossAmount / (1 + newRate));
      const newVat = round2(line.grossAmount - newNet);
      return {
        ...line,
        netAmount: newNet,
        vatAmount: newVat,
        grossAmount: round2(line.grossAmount),
        vatRate: newRate,
      };
    }
    // preserveNet (ברירת מחדל)
    const newNet = round2(line.netAmount);
    const newVat = round2(newNet * newRate);
    const newGross = round2(newNet + newVat);
    return {
      ...line,
      netAmount: newNet,
      vatAmount: newVat,
      grossAmount: newGross,
      vatRate: newRate,
    };
  });

  const newNet = sum(newLines, (l) => l.netAmount);
  const newVat = sum(newLines, (l) => l.vatAmount);
  const newGross = sum(newLines, (l) => l.grossAmount);

  return {
    invoice: { ...invoice, lines: newLines },
    report: {
      invoiceId: invoice.id,
      changed: true,
      oldTotals: { net: oldNet, vat: oldVat, gross: oldGross },
      newTotals: { net: newNet, vat: newVat, gross: newGross },
      oldRate,
      newRate,
    },
  };
}

/**
 * Migration אצווה - מקבל מערך חשבוניות ומחזיר דוח מצטבר.
 * שימושי ל-CLI/script שמריץ את ה-migration על כל ה-DB.
 */
export function recomputeBatch(
  invoices: InvoiceLike[],
  options: RecomputeOptions = {}
): { invoices: InvoiceLike[]; reports: RecomputeResult[]; summary: BatchSummary } {
  const newInvoices: InvoiceLike[] = [];
  const reports: RecomputeResult[] = [];
  let changed = 0;
  let skipped = 0;
  let deltaVat = 0;

  for (const inv of invoices) {
    const { invoice, report } = recomputeInvoiceTotals(inv, options);
    newInvoices.push(invoice);
    reports.push(report);
    if (report.changed) {
      changed++;
      deltaVat += report.newTotals.vat - report.oldTotals.vat;
    } else {
      skipped++;
    }
  }

  return {
    invoices: newInvoices,
    reports,
    summary: {
      total: invoices.length,
      changed,
      skipped,
      vatDelta: round2(deltaVat),
    },
  };
}

export interface BatchSummary {
  total: number;
  changed: number;
  skipped: number;
  /** הפרש כולל בסכום המע"מ (חיובי = יותר מע"מ לגביה) */
  vatDelta: number;
}

// ===== utils =====
function sum<T>(arr: T[], pick: (x: T) => number): number {
  return round2(arr.reduce((acc, x) => acc + pick(x), 0));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
