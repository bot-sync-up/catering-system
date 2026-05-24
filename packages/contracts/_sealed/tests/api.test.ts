import { describe, it, expect } from 'vitest';
import {
  CreateOrderInputSchema,
  PayOrderInputSchema,
} from '../src/api/orders.js';
import { ScheduleEventInputSchema } from '../src/api/events.js';
import { newId } from '../src/common/id.js';
import { money } from '../src/common/money.js';

describe('API contracts', () => {
  it('validates createOrder input', () => {
    const r = CreateOrderInputSchema.safeParse({
      customerId: newId(),
      type: 'ONE_TIME_EVENT',
      items: [
        {
          description: 'מנת חמין',
          quantity: '2',
          unitPrice: money('50'),
          discountPct: 0,
          taxRate: 0.18,
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('validates payOrder input', () => {
    const r = PayOrderInputSchema.safeParse({
      orderId: newId(),
      method: 'BIT',
      amount: money('118'),
    });
    expect(r.success).toBe(true);
  });

  it('validates scheduleEvent input', () => {
    const start = new Date('2026-06-01T17:00:00Z').toISOString();
    const end = new Date('2026-06-01T23:00:00Z').toISOString();
    const r = ScheduleEventInputSchema.safeParse({
      customerId: newId(),
      type: 'WEDDING',
      title: 'חתונה — משפחת לוי',
      startAt: start,
      endAt: end,
      headcount: 250,
      menuRefs: [],
    });
    expect(r.success).toBe(true);
  });
});
