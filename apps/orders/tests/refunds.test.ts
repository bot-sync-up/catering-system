import { describe, it, expect } from 'vitest';
import { buildRefundPlan } from '../src/domain/cancellation/refunds';

describe('Refund plan — צ׳קים והעברות', () => {
  const now = new Date('2026-05-01T00:00:00Z');

  it('צ׳ק עתידי שעוד לא נפרע — מתבטל ולא מוחזר ככסף', () => {
    const plan = buildRefundPlan(
      [
        {
          id: 'p1',
          method: 'CHECK',
          amount: 500,
          status: 'PENDING',
          checkDueDate: new Date('2026-06-15'),
        },
      ],
      500,
      now
    );
    expect(plan.items[0].isCheckCancellation).toBe(true);
    expect(plan.items[0].refundMethod).toBe('CHECK');
  });

  it('צ׳ק שכבר נפרע — חוזר בהעברה בנקאית', () => {
    const plan = buildRefundPlan(
      [
        {
          id: 'p1',
          method: 'CHECK',
          amount: 500,
          status: 'PAID',
          checkDueDate: new Date('2026-04-01'),
        },
      ],
      500,
      now
    );
    expect(plan.items[0].isCheckCancellation).toBe(false);
    expect(plan.items[0].refundMethod).toBe('BANK_TRANSFER');
  });

  it('כרטיס אשראי שולם — מוחזר בכרטיס', () => {
    const plan = buildRefundPlan(
      [
        { id: 'p1', method: 'CREDIT_CARD', amount: 800, status: 'PAID' },
      ],
      300,
      now
    );
    expect(plan.items[0].refundMethod).toBe('CREDIT_CARD');
    expect(plan.items[0].amount).toBe(300);
  });

  it('החזר חלקי על שני תשלומים — מתחיל מצ׳קים עתידיים', () => {
    const plan = buildRefundPlan(
      [
        {
          id: 'p1',
          method: 'CHECK',
          amount: 200,
          status: 'PENDING',
          checkDueDate: new Date('2026-07-01'),
        },
        { id: 'p2', method: 'CASH', amount: 800, status: 'PAID' },
      ],
      500,
      now
    );
    // 200 מהצ'ק העתידי + 300 מזומן
    expect(plan.items).toHaveLength(2);
    expect(plan.items[0].paymentId).toBe('p1');
    expect(plan.items[0].amount).toBe(200);
    expect(plan.items[1].paymentId).toBe('p2');
    expect(plan.items[1].amount).toBe(300);
  });
});
