/**
 * החזרי תשלום — לוגיקה לפי שיטת תשלום.
 * שימת לב מיוחדת לצ'קים: אם הצ'ק טרם נפרע, אפשר לבטל אותו (לא להחזיר כסף).
 * אם נפרע — מחזירים בדרך אחרת (העברה בנקאית / צ'ק חדש).
 */

export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'CHECK';

export interface PaymentLike {
  id: string;
  method: PaymentMethod;
  amount: number;
  status: 'PENDING' | 'PAID' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FAILED';
  checkDueDate?: Date | null;
}

export interface RefundPlanItem {
  paymentId: string;
  originalMethod: PaymentMethod;
  refundMethod: PaymentMethod;
  amount: number;
  /** האם זה ביטול צ'ק פיזי (לפני פירעון) במקום החזר ממש */
  isCheckCancellation: boolean;
  notes?: string;
}

export interface RefundPlan {
  totalRefund: number;
  items: RefundPlanItem[];
}

const NOTE_CHECK_CANCEL = `ביטול צ'ק פיזי לפני פירעון`;
const NOTE_CHECK_PAID = `הצ'ק נפרע — החזר בהעברה בנקאית`;

/**
 * בונה תוכנית החזר. מחלק את סכום ההחזר בין התשלומים שבוצעו.
 * עבור צ'קים — אם תאריך הפירעון בעתיד, מציע "ביטול צ'ק".
 */
export function buildRefundPlan(
  payments: PaymentLike[],
  totalRefund: number,
  now: Date = new Date()
): RefundPlan {
  const items: RefundPlanItem[] = [];
  let remaining = totalRefund;

  // קודם — צ'קים שעוד לא נפרעו (ניתן לבטל אותם — חיסכון).
  const futureChecks = payments.filter(
    (p) =>
      p.method === 'CHECK' &&
      p.status === 'PENDING' &&
      p.checkDueDate &&
      p.checkDueDate.getTime() > now.getTime()
  );

  for (const p of futureChecks) {
    if (remaining <= 0) break;
    const amt = Math.min(p.amount, remaining);
    items.push({
      paymentId: p.id,
      originalMethod: 'CHECK',
      refundMethod: 'CHECK',
      amount: amt,
      isCheckCancellation: true,
      notes: NOTE_CHECK_CANCEL,
    });
    remaining = round2(remaining - amt);
  }

  // אחר כך תשלומים שבוצעו (PAID)
  const paidPayments = payments.filter(
    (p) => p.status === 'PAID' && !futureChecks.includes(p)
  );

  for (const p of paidPayments) {
    if (remaining <= 0) break;
    const amt = Math.min(p.amount, remaining);
    items.push({
      paymentId: p.id,
      originalMethod: p.method,
      // צ'ק שכבר נפרע מוחזר בהעברה בנקאית
      refundMethod: p.method === 'CHECK' ? 'BANK_TRANSFER' : p.method,
      amount: amt,
      isCheckCancellation: false,
      notes: p.method === 'CHECK' ? NOTE_CHECK_PAID : undefined,
    });
    remaining = round2(remaining - amt);
  }

  return { totalRefund: round2(totalRefund - remaining), items };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
