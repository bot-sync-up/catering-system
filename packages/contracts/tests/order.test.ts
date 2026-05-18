import { describe, it, expect } from 'vitest';
import { OrderSchema } from '../src/entities/Order.js';
import { newId } from '../src/common/id.js';
import { money } from '../src/common/money.js';

const now = new Date().toISOString();

const baseItem = (qty = '1', price = '100') => ({
  id: newId(),
  description: 'מנת חמין',
  quantity: qty,
  unitPrice: money(price),
  discountPct: 0,
  taxRate: 0.18,
  lineTotal: money(price),
});

describe('Order', () => {
  it('accepts ONE_TIME_EVENT without recurrence', () => {
    const r = OrderSchema.safeParse({
      id: newId(),
      type: 'ONE_TIME_EVENT',
      status: 'DRAFT',
      customerId: newId(),
      channel: 'DIRECT',
      items: [baseItem()],
      subtotal: money('100'),
      taxTotal: money('18'),
      discountTotal: money('0'),
      grandTotal: money('118'),
      createdAt: now,
      updatedAt: now,
    });
    expect(r.success).toBe(true);
  });

  it('requires recurrence for SUBSCRIPTION', () => {
    const r = OrderSchema.safeParse({
      id: newId(),
      type: 'SUBSCRIPTION',
      status: 'DRAFT',
      customerId: newId(),
      channel: 'DIRECT',
      items: [baseItem()],
      subtotal: money('100'),
      taxTotal: money('18'),
      discountTotal: money('0'),
      grandTotal: money('118'),
      createdAt: now,
      updatedAt: now,
    });
    expect(r.success).toBe(false);
  });

  it('rejects recurrence on ONE_TIME_EVENT', () => {
    const r = OrderSchema.safeParse({
      id: newId(),
      type: 'ONE_TIME_EVENT',
      status: 'DRAFT',
      customerId: newId(),
      channel: 'DIRECT',
      items: [baseItem()],
      subtotal: money('100'),
      taxTotal: money('18'),
      discountTotal: money('0'),
      grandTotal: money('118'),
      recurrence: { cadence: 'MONTHLY', startDate: now },
      createdAt: now,
      updatedAt: now,
    });
    expect(r.success).toBe(false);
  });
});
