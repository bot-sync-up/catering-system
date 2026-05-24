/**
 * Integration test: payment.captured → invoice.paid (CardcomToFinanceAdapter)
 * וגם invoice.issued → iCount sync (FinanceToIcountAdapter).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CardcomToFinanceAdapter,
  FinanceToIcountAdapter,
} from '@catering/integration-adapters';
import { CardcomPublisher } from '../../src/publishers/cardcom-publisher.js';
import { FinancePublisher } from '../../src/publishers/finance-publisher.js';
import { FakeBus, FakeRedis, asBus } from './fakes.js';

describe('wiring: payment → invoice.paid + invoice → iCount', () => {
  let bus: FakeBus;
  let redis: FakeRedis;
  let icountCalls: any[];

  beforeEach(() => {
    bus = new FakeBus();
    redis = new FakeRedis();
    icountCalls = [];
  });

  it('מסמן חשבונית כשולמה כשמתקבל תשלום', async () => {
    const adapter = new CardcomToFinanceAdapter({
      bus: asBus(bus),
      redis: redis as any,
      finance: {
        async markInvoicePaid(input) {
          return { fullyPaid: true };
        },
      },
    });
    await adapter.start();

    const publisher = new CardcomPublisher({ bus: asBus(bus) });
    await publisher.publishPaymentCaptured({
      paymentId: 'pay-1',
      invoiceId: 'inv-1',
      amount: 1170,
      cardcomTransactionId: 'cc-txn-1',
    });

    const paidEvents = bus.eventsOfType('invoice.paid');
    expect(paidEvents).toHaveLength(1);
    expect(paidEvents[0].payload.invoiceId).toBe('inv-1');
    expect(paidEvents[0].payload.fullyPaid).toBe(true);

    await adapter.stop();
  });

  it('מסנכרן חשבונית ל-iCount כשהיא מונפקת', async () => {
    const adapter = new FinanceToIcountAdapter({
      bus: asBus(bus),
      redis: redis as any,
      icount: {
        async createInvoice(input) {
          icountCalls.push({ kind: 'create', input });
          return { icountDocId: 'icount-1', docNumber: '20260101' };
        },
        async allocate(input) {
          icountCalls.push({ kind: 'allocate', input });
          return { allocationId: 'alloc-1' };
        },
      },
    });
    await adapter.start();

    const publisher = new FinancePublisher({ bus: asBus(bus) });
    await publisher.publishInvoiceIssued({
      invoiceId: 'inv-7',
      customerId: 'cust-7',
      totalAmount: 500,
      dueDate: '2026-06-30',
      items: [
        { description: 'item', quantity: 1, unitPrice: 500, totalPrice: 500, vatRate: 0.17 },
      ],
    });

    expect(icountCalls).toHaveLength(2);
    expect(icountCalls[0].kind).toBe('create');
    expect(icountCalls[0].input.invoiceId).toBe('inv-7');
    expect(icountCalls[1].kind).toBe('allocate');
    expect(icountCalls[1].input.icountDocId).toBe('icount-1');

    await adapter.stop();
  });
});
