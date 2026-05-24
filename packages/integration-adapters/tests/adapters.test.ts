import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '@catering/event-bus';
import {
  OrdersToFinanceAdapter,
  FinanceToICountAdapter,
  MockICountClient,
  FinanceToCardcomAdapter,
  MockCardcomClient,
  CardcomToFinanceAdapter,
  InventoryToPurchasingAdapter,
  HrToPayrollAdapter,
  PortalToOrdersAdapter,
} from '../src/index.js';

describe('Adapters smoke', () => {
  it('OrdersToFinanceAdapter publishes invoice.issued on order.approved', async () => {
    const bus = new EventBus({ inMemory: true });
    const createInvoice = vi.fn(async () => ({ invoiceId: 'INV-1', externalRef: 'X' }));
    const adapter = new OrdersToFinanceAdapter({
      bus,
      finance: { createInvoice },
      getOrderAmount: async () => ({ amount: 1500, currency: 'ILS' }),
    });
    const invoicesSeen: string[] = [];
    bus.subscribe('invoice.issued', (e) => { invoicesSeen.push(e.payload.invoiceId); });

    await adapter.start();
    await bus.start();
    await bus.publish('order.approved', { orderId: 'O-1', approvedBy: 'manager' });

    expect(createInvoice).toHaveBeenCalledWith({ orderId: 'O-1', amount: 1500, currency: 'ILS' });
    expect(invoicesSeen).toEqual(['INV-1']);
  });

  it('FinanceToICountAdapter calls iCount on invoice.issued', async () => {
    const bus = new EventBus({ inMemory: true });
    const icount = new MockICountClient();
    const adapter = new FinanceToICountAdapter({
      bus,
      icount,
      getInvoiceMeta: async () => ({ customerName: 'Acme', items: [{ description: 'X', quantity: 1, unitPrice: 100 }] }),
    });
    await adapter.start();
    await bus.start();
    await bus.publish('invoice.issued', { invoiceId: 'I1', orderId: 'O1', amount: 100, currency: 'ILS' });
    expect(icount.calls).toHaveLength(1);
    expect(icount.calls[0]?.orderId).toBe('O1');
  });

  it('FinanceToCardcomAdapter creates a payment link', async () => {
    const bus = new EventBus({ inMemory: true });
    const cardcom = new MockCardcomClient();
    const adapter = new FinanceToCardcomAdapter({ bus, cardcom });
    await adapter.start();
    await bus.start();
    await bus.publish('invoice.issued', { invoiceId: 'I1', orderId: 'O1', amount: 200, currency: 'ILS' });
    expect(cardcom.calls).toHaveLength(1);
    expect(cardcom.calls[0]?.amount).toBe(200);
  });

  it('CardcomToFinanceAdapter handles approved webhook → payment.received', async () => {
    const bus = new EventBus({ inMemory: true });
    const mark = vi.fn(async () => {});
    const adapter = new CardcomToFinanceAdapter({ bus, finance: { markPaymentReceived: mark } });
    await adapter.start();
    await bus.start();
    await adapter.handleWebhook({
      webhookId: 'w-1', dealId: 'd-1', orderId: 'o-1', amount: 100, currency: 'ILS', status: 'approved',
    });
    expect(mark).toHaveBeenCalledWith({ orderId: 'o-1', paymentId: 'd-1', amount: 100 });
  });

  it('CardcomToFinanceAdapter publishes payment.failed for declined webhook', async () => {
    const bus = new EventBus({ inMemory: true });
    const adapter = new CardcomToFinanceAdapter({ bus, finance: { markPaymentReceived: async () => {} } });
    const failures: string[] = [];
    bus.subscribe('payment.failed', (e) => { failures.push(e.payload.reason); });
    await adapter.start();
    await bus.start();
    await adapter.handleWebhook({
      webhookId: 'w-2', dealId: 'd-2', orderId: 'o-2', amount: 50, currency: 'ILS',
      status: 'declined', errorReason: 'insufficient funds',
    });
    expect(failures).toEqual(['insufficient funds']);
  });

  it('InventoryToPurchasingAdapter creates PO with reorder multiplier', async () => {
    const bus = new EventBus({ inMemory: true });
    const createPurchaseOrder = vi.fn(async () => 'PO-1');
    const adapter = new InventoryToPurchasingAdapter({
      bus, purchasing: { createPurchaseOrder }, reorderMultiplier: 4,
    });
    await adapter.start();
    await bus.start();
    await bus.publish('inventory.low', { sku: 'SKU-A', currentQty: 2, minQty: 10, warehouse: 'WH1' });
    expect(createPurchaseOrder).toHaveBeenCalledWith({ sku: 'SKU-A', quantity: 40, warehouse: 'WH1' });
  });

  it('HrToPayrollAdapter records punches', async () => {
    const bus = new EventBus({ inMemory: true });
    const recordPunch = vi.fn(async () => {});
    const adapter = new HrToPayrollAdapter({ bus, payroll: { recordPunch } });
    await adapter.start();
    await bus.start();
    await bus.publish('employee.clocked', { employeeId: 'E1', action: 'in', at: '2026-05-11T08:00:00Z' });
    expect(recordPunch).toHaveBeenCalled();
  });

  it('PortalToOrdersAdapter creates order on quote.accepted', async () => {
    const bus = new EventBus({ inMemory: true });
    const createFromQuote = vi.fn(async () => 'ORD-1');
    const adapter = new PortalToOrdersAdapter({ bus, orders: { createFromQuote } });
    await adapter.start();
    await bus.start();
    await bus.publish('quote.accepted', { quoteId: 'Q1', leadId: 'L1', acceptedAt: '2026-05-11T08:00:00Z' });
    expect(createFromQuote).toHaveBeenCalledWith({ quoteId: 'Q1', leadId: 'L1' });
  });
});
