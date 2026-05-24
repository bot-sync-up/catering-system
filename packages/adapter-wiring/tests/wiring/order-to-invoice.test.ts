/**
 * Integration test: order.approved → invoice.issued (דרך OrdersToFinanceAdapter).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OrdersToFinanceAdapter } from '@catering/integration-adapters';
import { OrdersPublisher } from '../../src/publishers/orders-publisher.js';
import { FakeBus, FakeRedis, asBus } from './fakes.js';

describe('wiring: order → invoice', () => {
  let bus: FakeBus;
  let redis: FakeRedis;

  beforeEach(() => {
    bus = new FakeBus();
    redis = new FakeRedis();
  });

  it('יוצר חשבונית כאשר ההזמנה מאושרת', async () => {
    const adapter = new OrdersToFinanceAdapter({
      bus: asBus(bus),
      redis: redis as any,
      invoice: {
        async issueInvoice(input) {
          return {
            invoiceId: `inv-${input.orderId}`,
            totalAmount: 1000,
            dueDate: '2026-06-30',
          };
        },
      },
      orders: {
        async getOrder(orderId) {
          return {
            customerId: 'cust-1',
            items: [{ description: 'תפריט בסיסי', quantity: 1, unitPrice: 1000 }],
          };
        },
      },
    });
    await adapter.start();

    const publisher = new OrdersPublisher({ bus: asBus(bus) });
    await publisher.publishOrderApproved({ orderId: 'ord-1', approvedBy: 'mgr-1' });

    const invoices = bus.eventsOfType('invoice.issued');
    expect(invoices).toHaveLength(1);
    expect(invoices[0].payload.invoiceId).toBe('inv-ord-1');
    expect(invoices[0].payload.orderId).toBe('ord-1');
    expect(invoices[0].payload.totalAmount).toBe(1000);

    await adapter.stop();
  });
});
