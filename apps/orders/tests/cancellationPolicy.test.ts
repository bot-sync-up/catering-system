import { describe, it, expect } from 'vitest';
import { quoteRefund, DEFAULT_POLICY } from '../src/domain/cancellation/policy';

describe('Cancellation policy — refund quotes', () => {
  const total = 1000;
  const event = new Date('2026-06-01T12:00:00Z');

  it('מעל 30 יום מראש -> 100%', () => {
    const now = new Date('2026-04-15T12:00:00Z');
    const q = quoteRefund(total, event, now);
    expect(q.refundPercent).toBe(100);
    expect(q.refundAmount).toBe(1000);
  });

  it('בערך 20 יום לפני -> 75%', () => {
    const now = new Date('2026-05-12T12:00:00Z'); // 20 ימים
    const q = quoteRefund(total, event, now);
    expect(q.refundPercent).toBe(75);
    expect(q.refundAmount).toBe(750);
  });

  it('10 ימים לפני -> 50%', () => {
    const now = new Date('2026-05-22T12:00:00Z');
    const q = quoteRefund(total, event, now);
    expect(q.refundPercent).toBe(50);
    expect(q.refundAmount).toBe(500);
  });

  it('3 ימים לפני -> 25%', () => {
    const now = new Date('2026-05-29T12:00:00Z');
    const q = quoteRefund(total, event, now);
    expect(q.refundPercent).toBe(25);
    expect(q.refundAmount).toBe(250);
  });

  it('יום אחד לפני -> 0%', () => {
    const now = new Date('2026-05-31T12:00:00Z');
    const q = quoteRefund(total, event, now);
    expect(q.refundPercent).toBe(0);
    expect(q.refundAmount).toBe(0);
  });

  it('אחרי האירוע — 0% החזר', () => {
    const now = new Date('2026-06-02T12:00:00Z');
    const q = quoteRefund(total, event, now);
    expect(q.refundAmount).toBe(0);
  });

  it('המדיניות הסטנדרטית מכילה 5 טירים', () => {
    expect(DEFAULT_POLICY.tiers).toHaveLength(5);
  });
});
