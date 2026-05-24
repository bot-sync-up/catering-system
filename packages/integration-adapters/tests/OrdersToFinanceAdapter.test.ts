import { describe, it, expect, vi } from 'vitest';
import { OrdersToFinanceAdapter } from '../src/adapters/OrdersToFinanceAdapter.js';
import { makeMockBus, makeMockRedis } from './helpers.js';
import type { Redis } from 'ioredis';

describe('OrdersToFinanceAdapter', () => {
  it('מוציא Invoice ומפרסם invoice.issued', async () => {
    const bus = makeMockBus();
    const redis = makeMockRedis();
    const items = [{ description: 'מנת עוף', quantity: 50, unitPrice: 80 }];
    const orders = { getOrder: vi.fn(async () => ({ customerId: 'c-1', items })) };
    const invoice = {
      issueInvoice: vi.fn(async () => ({
        invoiceId: 'inv-1',
        totalAmount: 4000,
        dueDate: '2026-02-01',
      })),
    };

    const adapter = new OrdersToFinanceAdapter({
      bus,
      redis: redis as unknown as Redis,
      orders,
      invoice,
    });

    await adapter['handle']({
      event: {
        name: 'order.approved',
        metadata: {
          id: 'evt-2',
          timestamp: '2026-01-02T00:00:00Z',
          source: 'orders',
          schemaVersion: 1,
        },
        payload: {
          orderId: 'ord-1',
          approvedBy: 'mgr-1',
          approvedAt: '2026-01-02T00:00:00Z',
        },
      },
      attempt: 1,
    });

    expect(invoice.issueInvoice).toHaveBeenCalled();
    expect(bus.__published[0]!.name).toBe('invoice.issued');
    const published = bus.__published[0]!.payload as { totalAmount: number; items: unknown[] };
    expect(published.totalAmount).toBe(4000);
    expect(published.items).toHaveLength(1);
  });
});
