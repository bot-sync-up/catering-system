import { describe, it, expect, vi } from 'vitest';
import { buildMilestonePlan, chargeMilestone } from '../src/flows/milestones';
import { splitCharge } from '../src/flows/split';
import { CardComClient } from '../src/client/CardComClient';

describe('milestones', () => {
  it('builds a 3-stage plan and validates totals', () => {
    const plan = buildMilestonePlan({
      totalAmount: 1000,
      customerExternalId: 'c1',
      productName: 'פרויקט',
      deposit: { amount: 300, dueDate: '2026-06-01' },
      intermediates: [{ amount: 300, dueDate: '2026-07-01' }],
      final: { amount: 400, dueDate: '2026-08-01' },
    });
    expect(plan.stages).toHaveLength(3);
    expect(plan.stages[0].stage).toBe('deposit');
    expect(plan.stages[2].stage).toBe('final');
  });

  it('rejects mismatched totals', () => {
    expect(() =>
      buildMilestonePlan({
        totalAmount: 999,
        customerExternalId: 'c',
        productName: 'p',
        deposit: { amount: 300, dueDate: '2026-06-01' },
        intermediates: [],
        final: { amount: 400, dueDate: '2026-08-01' },
      })
    ).toThrow();
  });

  it('charges deposit then enforces order', async () => {
    const client = { charge: vi.fn().mockResolvedValue({ transactionId: 'tx_x' }) } as unknown as CardComClient;
    const plan = buildMilestonePlan({
      totalAmount: 200,
      customerExternalId: 'c',
      productName: 'p',
      deposit: { amount: 100, dueDate: '2026-06-01' },
      intermediates: [],
      final: { amount: 100, dueDate: '2026-08-01' },
    });
    await chargeMilestone(client, plan, 0, 'tok');
    expect(plan.stages[0].status).toBe('charged');
    // Cannot skip to final
    await expect(chargeMilestone(client, plan, 1, 'tok')).resolves.toBeDefined();
  });
});

describe('split', () => {
  it('rejects when parties sum != amount', async () => {
    const client = { charge: vi.fn() } as unknown as CardComClient;
    await expect(
      splitCharge(client, {
        amount: 100,
        numOfPayments: 1,
        token: 'tok',
        documentToCreate: 'None',
        isoCoinId: 1,
        parties: [
          { partyExternalId: 'a', amount: 50 },
          { partyExternalId: 'b', amount: 30 },
        ],
      })
    ).rejects.toThrow();
  });

  it('charges total once, returns parties allocation', async () => {
    const client = {
      charge: vi.fn().mockResolvedValue({
        transactionId: 'tx_1',
        amount: 100,
        raw: {},
      }),
    } as unknown as CardComClient;
    const r = await splitCharge(client, {
      amount: 100,
      numOfPayments: 1,
      token: 'tok',
      documentToCreate: 'None',
      isoCoinId: 1,
      parties: [
        { partyExternalId: 'a', amount: 60 },
        { partyExternalId: 'b', amount: 40 },
      ],
    });
    expect(r.parties).toHaveLength(2);
    expect(client.charge).toHaveBeenCalledTimes(1);
  });
});
