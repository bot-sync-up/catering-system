import { describe, it, expect } from 'vitest';
import {
  DomainEventSchema,
  OrderPlacedEventSchema,
  PaymentReceivedEventSchema,
  EVENT_NAMES,
} from '../src/events/index.js';
import { newId } from '../src/common/id.js';
import { money } from '../src/common/money.js';

const now = new Date().toISOString();

describe('Domain Events', () => {
  it('parses order.placed event', () => {
    const r = OrderPlacedEventSchema.safeParse({
      eventId: newId(),
      name: 'order.placed',
      version: 1,
      occurredAt: now,
      payload: {
        orderId: newId(),
        customerId: newId(),
        type: 'ONE_TIME_EVENT',
        grandTotal: money('118'),
      },
    });
    expect(r.success).toBe(true);
  });

  it('parses payment.received event', () => {
    const r = PaymentReceivedEventSchema.safeParse({
      eventId: newId(),
      name: 'payment.received',
      version: 1,
      occurredAt: now,
      payload: {
        paymentId: newId(),
        customerId: newId(),
        amount: money('118'),
        method: 'CREDIT_CARD',
      },
    });
    expect(r.success).toBe(true);
  });

  it('discriminated union routes by name', () => {
    const r = DomainEventSchema.safeParse({
      eventId: newId(),
      name: 'order.placed',
      version: 1,
      occurredAt: now,
      payload: {
        orderId: newId(),
        customerId: newId(),
        type: 'ONE_TIME_EVENT',
        grandTotal: money('100'),
      },
    });
    expect(r.success).toBe(true);
  });

  it('lists all event names', () => {
    expect(EVENT_NAMES).toContain('lead.created');
    expect(EVENT_NAMES).toContain('invoice.paid');
    expect(EVENT_NAMES).toContain('payroll.calculated');
    expect(EVENT_NAMES.length).toBeGreaterThanOrEqual(18);
  });
});
