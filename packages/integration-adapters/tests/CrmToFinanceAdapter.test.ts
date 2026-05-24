import { describe, it, expect, vi } from 'vitest';
import { CrmToFinanceAdapter } from '../src/adapters/CrmToFinanceAdapter.js';
import { makeMockBus, makeMockRedis } from './helpers.js';
import type { Redis } from 'ioredis';

describe('CrmToFinanceAdapter', () => {
  it('יוצר Quote ומפרסם quote.sent כאשר lead.qualified מתקבל', async () => {
    const bus = makeMockBus();
    const redis = makeMockRedis();
    const crm = {
      getLead: vi.fn(async () => ({
        customerName: 'דני כהן',
        customerId: 'cust-1',
        estimatedValue: 12000,
      })),
    };
    const finance = {
      createQuote: vi.fn(async () => ({
        quoteId: 'q-1',
        totalAmount: 12000,
        validUntil: '2026-12-31',
      })),
    };

    const adapter = new CrmToFinanceAdapter({
      bus,
      redis: redis as unknown as Redis,
      crm,
      finance,
    });

    await adapter['handle']({
      event: {
        name: 'lead.qualified',
        metadata: {
          id: 'evt-1',
          timestamp: '2026-01-01T00:00:00Z',
          source: 'crm',
          schemaVersion: 1,
        },
        payload: { leadId: 'lead-1', qualifiedBy: 'rep-1', score: 90 },
      },
      attempt: 1,
    });

    expect(crm.getLead).toHaveBeenCalledWith('lead-1');
    expect(finance.createQuote).toHaveBeenCalled();
    expect(bus.__published).toHaveLength(1);
    expect(bus.__published[0]!.name).toBe('quote.sent');
  });
});
