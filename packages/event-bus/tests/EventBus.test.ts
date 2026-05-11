import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from '../src/EventBus.js';
import type { OrderPlacedPayload } from '../src/types.js';

describe('EventBus (in-memory)', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus({ inMemory: true });
  });

  it('publishes and dispatches events synchronously in-memory', async () => {
    const received: OrderPlacedPayload[] = [];
    bus.subscribe('order.placed', async (evt) => {
      received.push(evt.payload);
    });
    await bus.start();

    await bus.publish('order.placed', {
      orderId: 'o-1',
      customerId: 'c-1',
      totalAmount: 100,
      currency: 'ILS',
      items: [{ sku: 'A', quantity: 1, unitPrice: 100 }],
    });

    expect(received).toHaveLength(1);
    expect(received[0]?.orderId).toBe('o-1');
  });

  it('generates a unique event id when not supplied', async () => {
    const ids: string[] = [];
    bus.subscribe('lead.created', async (evt) => {
      ids.push(evt.id);
    });
    await bus.start();

    await bus.publish('lead.created', { leadId: 'l1', customerName: 'X', phone: '050' });
    await bus.publish('lead.created', { leadId: 'l2', customerName: 'Y', phone: '050' });

    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('routes events to the correct subscribers by type', async () => {
    const leadHits: string[] = [];
    const orderHits: string[] = [];
    bus.subscribe('lead.created', async (e) => { leadHits.push(e.payload.leadId); });
    bus.subscribe('order.placed', async (e) => { orderHits.push(e.payload.orderId); });
    await bus.start();

    await bus.publish('lead.created', { leadId: 'L1', customerName: 'a', phone: 'p' });
    await bus.publish('order.placed', {
      orderId: 'O1', customerId: 'C1', totalAmount: 10, currency: 'ILS',
      items: [{ sku: 'S', quantity: 1, unitPrice: 10 }],
    });

    expect(leadHits).toEqual(['L1']);
    expect(orderHits).toEqual(['O1']);
  });

  it('supports multiple handlers per event', async () => {
    const a: string[] = [];
    const b: string[] = [];
    bus.subscribe('payment.received', (e) => { a.push(e.payload.paymentId); });
    bus.subscribe('payment.received', (e) => { b.push(e.payload.paymentId); });
    await bus.start();

    await bus.publish('payment.received', {
      paymentId: 'p1', orderId: 'o1', amount: 100, currency: 'ILS', method: 'credit_card',
    });

    expect(a).toEqual(['p1']);
    expect(b).toEqual(['p1']);
  });

  it('stops cleanly without errors', async () => {
    await bus.start();
    await bus.stop();
    expect(true).toBe(true);
  });
});
