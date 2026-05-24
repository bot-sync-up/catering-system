/**
 * מנוע מדיניות ביטול
 * -----------------------
 * מקבל מדיניות (מערך טירים, כל טיר = טווח שעות לפני האירוע + אחוז החזר).
 * מחשב כמה החזר מגיע ללקוח לפי קרבה לתאריך האירוע.
 *
 * דוגמת ברירת מחדל:
 *   - מעל 30 יום מראש -> 100%
 *   - 14-30 יום       -> 75%
 *   - 7-14 יום        -> 50%
 *   - 2-7 ימים        -> 25%
 *   - מתחת ל-48 שעות   -> 0%
 */

export interface PolicyTier {
  hoursBeforeMin: number;      // כולל
  hoursBeforeMax: number | null; // לא כולל; null = אינסוף
  refundPercent: number;       // 0..100
}

export interface CancellationPolicy {
  name: string;
  tiers: PolicyTier[];
}

export const DEFAULT_POLICY: CancellationPolicy = {
  name: 'מדיניות סטנדרטית',
  tiers: [
    { hoursBeforeMin: 0, hoursBeforeMax: 48, refundPercent: 0 },
    { hoursBeforeMin: 48, hoursBeforeMax: 24 * 7, refundPercent: 25 },
    { hoursBeforeMin: 24 * 7, hoursBeforeMax: 24 * 14, refundPercent: 50 },
    { hoursBeforeMin: 24 * 14, hoursBeforeMax: 24 * 30, refundPercent: 75 },
    { hoursBeforeMin: 24 * 30, hoursBeforeMax: null, refundPercent: 100 },
  ],
};

export interface RefundQuote {
  refundPercent: number;
  refundAmount: number;
  hoursBefore: number;
  appliedTier: PolicyTier | null;
}

/**
 * חישוב החזר.
 * @param totalAmount הסכום ששולם
 * @param eventAt מתי האירוע
 * @param now הזמן הנוכחי (להזרקה בטסטים)
 * @param policy מדיניות (ברירת מחדל אם לא ניתן)
 */
export function quoteRefund(
  totalAmount: number,
  eventAt: Date,
  now: Date = new Date(),
  policy: CancellationPolicy = DEFAULT_POLICY
): RefundQuote {
  const msDiff = eventAt.getTime() - now.getTime();
  const hoursBefore = Math.max(0, msDiff / (1000 * 60 * 60));

  // אם הזמן עבר — אין החזר.
  if (msDiff <= 0) {
    return {
      refundPercent: 0,
      refundAmount: 0,
      hoursBefore: 0,
      appliedTier: null,
    };
  }

  const tier =
    policy.tiers.find(
      (t) =>
        hoursBefore >= t.hoursBeforeMin &&
        (t.hoursBeforeMax === null || hoursBefore < t.hoursBeforeMax)
    ) ?? null;

  const refundPercent = tier?.refundPercent ?? 0;
  // עיגול לאגורות
  const refundAmount = Math.round(totalAmount * refundPercent) / 100;

  return { refundPercent, refundAmount, hoursBefore, appliedTier: tier };
}
