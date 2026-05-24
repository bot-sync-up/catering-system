/**
 * החלפת הזמנה — במקום ביטול מלא, להעביר את הסכום (או חלקו) להזמנה חדשה.
 * המנוע מחשב כמה ניתן להעביר ומחזיר את ההפרש כהחזר/יתרת זכות.
 */

export interface SwapInput {
  oldOrderTotal: number;
  /** סכום ההחזר שהיה מגיע אילו בוטלה לגמרי לפי המדיניות */
  refundAvailable: number;
  /** סכום ההזמנה החדשה */
  newOrderTotal: number;
}

export interface SwapResult {
  /** כמה הופחת מהזמנה החדשה (קרדיט) */
  appliedCredit: number;
  /** כמה הלקוח עדיין צריך לשלם בנוסף */
  amountDueFromCustomer: number;
  /** כמה צריך להחזיר ללקוח (אם החדשה זולה מהקרדיט) */
  amountToRefundCustomer: number;
}

export function planSwap(input: SwapInput): SwapResult {
  const credit = Math.max(0, Math.min(input.refundAvailable, input.oldOrderTotal));
  const appliedCredit = Math.min(credit, input.newOrderTotal);
  const amountDueFromCustomer = round2(
    Math.max(0, input.newOrderTotal - appliedCredit)
  );
  const amountToRefundCustomer = round2(Math.max(0, credit - appliedCredit));

  return {
    appliedCredit: round2(appliedCredit),
    amountDueFromCustomer,
    amountToRefundCustomer,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
