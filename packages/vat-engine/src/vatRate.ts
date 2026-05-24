/**
 * vatRate.ts
 * ----------------------------------------------------------------------------
 * מנוע VAT מרכזי
 *
 * רקע: מ-1/1/2025 שיעור המע"מ בישראל עולה מ-17% ל-18%.
 * המודול נועד להוות מקור אמת יחיד (single source of truth) לחישוב המע"מ
 * בכל המודולים של המערכת, במקום פיזור קבועי 0.17 / 1.17 / "17%" בקוד.
 *
 * שימוש בסיסי:
 *   import { getVATRate } from '@syncup/vat-engine';
 *   const rate = getVATRate(new Date('2025-02-01')); // 0.18
 *
 * שימוש מתקדם (Multi-tenant):
 *   const rate = getVATRate(date, { tenantId: 'org-123' });
 *
 * שינויי תצורה דרך configureVATSchedule (למשל לטסטים או tenants עם תאריך מעבר שונה).
 * ----------------------------------------------------------------------------
 */

/** רשומה בלוח-זמנים של שיעורי המע"מ. effectiveFrom הוא inclusive. */
export interface VATScheduleEntry {
  /** התאריך שממנו (כולל) הרשומה תקפה */
  effectiveFrom: Date;
  /** שיעור המע"מ כשבר עשרוני (0.17 = 17%) */
  rate: number;
}

/** אפשרויות לחיפוש שיעור מע"מ */
export interface GetVATRateOptions {
  /** מזהה דייר/ארגון - תומך במקרה שבו tenants שונים עוברים בתאריכים שונים */
  tenantId?: string;
}

/**
 * לוח הזמנים הברירת-מחדל לפי החוק הישראלי.
 * הערה: effectiveFrom חייב להיות ממוין יורד (החדש ביותר ראשון) לצורך
 * אופטימיזציה של החיפוש - אנו עוצרים על ההתאמה הראשונה.
 */
const DEFAULT_SCHEDULE: VATScheduleEntry[] = [
  { effectiveFrom: new Date('2025-01-01T00:00:00Z'), rate: 0.18 },
  { effectiveFrom: new Date('0001-01-01T00:00:00Z'), rate: 0.17 },
];

/** לוחות זמנים מותאמים אישית לפי tenantId. */
const tenantSchedules = new Map<string, VATScheduleEntry[]>();

/**
 * מגדיר לוח-זמנים מותאם עבור tenant מסוים.
 * שימושי כשארגון מקבל החלטה שונה (למשל - דחיית המעבר ביום אחד).
 *
 * @param tenantId מזהה הדייר. אם undefined - מחליף את לוח הברירת-מחדל הגלובלי.
 * @param schedule רשימת רשומות. תמוין אוטומטית יורדת לפי effectiveFrom.
 */
export function configureVATSchedule(
  tenantId: string | undefined,
  schedule: VATScheduleEntry[]
): void {
  if (!Array.isArray(schedule) || schedule.length === 0) {
    throw new Error('VAT schedule חייב להכיל לפחות רשומה אחת');
  }
  const sorted = [...schedule].sort(
    (a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime()
  );
  if (tenantId) {
    tenantSchedules.set(tenantId, sorted);
  } else {
    // עדכון לוח גלובלי
    DEFAULT_SCHEDULE.length = 0;
    DEFAULT_SCHEDULE.push(...sorted);
  }
}

/** מנקה הגדרת tenant ספציפית או את כל ההגדרות המותאמות. */
export function resetVATSchedule(tenantId?: string): void {
  if (tenantId) {
    tenantSchedules.delete(tenantId);
  } else {
    tenantSchedules.clear();
  }
}

/**
 * מחזיר את שיעור המע"מ התקף בתאריך נתון.
 *
 * @param date תאריך החיוב/החשבונית. אם לא צוין - "עכשיו".
 * @param opts אפשרויות (tenantId).
 * @returns שבר עשרוני (0.17 או 0.18) - לא אחוז שלם!
 *
 * @example
 *   getVATRate(new Date('2024-12-31')) // 0.17
 *   getVATRate(new Date('2025-01-01')) // 0.18
 */
export function getVATRate(date: Date = new Date(), opts: GetVATRateOptions = {}): number {
  const schedule = (opts.tenantId && tenantSchedules.get(opts.tenantId)) || DEFAULT_SCHEDULE;
  const t = date.getTime();
  for (const entry of schedule) {
    if (t >= entry.effectiveFrom.getTime()) {
      return entry.rate;
    }
  }
  // fallback - לא אמור לקרות אם הלוח מכיל רשומת epoch.
  return schedule[schedule.length - 1].rate;
}

/**
 * מחזיר שיעור מע"מ כאחוז שלם (17 או 18).
 * שימושי להצגה בממשק או רשומות DB ישנות שמאחסנות אחוז.
 */
export function getVATPercent(date: Date = new Date(), opts: GetVATRateOptions = {}): number {
  return Math.round(getVATRate(date, opts) * 100);
}

/**
 * מחשב את סכום המע"מ על סכום ללא-מע"מ (net).
 * @param netAmount סכום לפני מע"מ
 * @param date תאריך החיוב (לקביעת שיעור)
 */
export function calcVATAmount(netAmount: number, date: Date = new Date(), opts: GetVATRateOptions = {}): number {
  return roundCurrency(netAmount * getVATRate(date, opts));
}

/**
 * מחשב את הסכום הכולל (net + VAT) על סכום ללא-מע"מ.
 * @param netAmount סכום לפני מע"מ
 * @param date תאריך החיוב
 */
export function calcGrossFromNet(netAmount: number, date: Date = new Date(), opts: GetVATRateOptions = {}): number {
  return roundCurrency(netAmount * (1 + getVATRate(date, opts)));
}

/**
 * הפרדת סכום ברוטו (כולל מע"מ) למרכיביו.
 * שימושי כשמקבלים מחיר סופי וצריכים לפצל לרשומת חשבונית.
 */
export function splitGross(
  grossAmount: number,
  date: Date = new Date(),
  opts: GetVATRateOptions = {}
): { net: number; vat: number; gross: number; rate: number } {
  const rate = getVATRate(date, opts);
  const net = roundCurrency(grossAmount / (1 + rate));
  const vat = roundCurrency(grossAmount - net);
  return { net, vat, gross: roundCurrency(grossAmount), rate };
}

/** עיגול עקבי ל-2 ספרות אחרי הנקודה (בנקאי-חצי-זוגי). */
function roundCurrency(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** קבועים שמיוצאים לנוחות - לעולם לא להשתמש בהם ישירות, להשתמש בפונקציה! */
export const VAT_RATES = Object.freeze({
  PRE_2025: 0.17,
  FROM_2025: 0.18,
});

/** תאריך המעבר הרשמי */
export const VAT_TRANSITION_DATE = new Date('2025-01-01T00:00:00Z');
