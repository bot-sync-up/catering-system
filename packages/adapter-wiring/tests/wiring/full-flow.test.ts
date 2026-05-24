/**
 * Integration test: זרימה מלאה portal → order → invoice → iCount.
 *
 * זה ה-"smoke test" המרכזי שמוודא שכל ה-wiring עובד יחד.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PortalToOrdersAdapter,
  OrdersToFinanceAdapter,
  OrdersToEventsAdapter,
  OrdersToKitchenAdapter,
  FinanceToIcountAdapter,
} from '@catering/integration-adapters';
import { PortalPublisher } from '../../src/publishers/portal-publisher.js';
import { OrdersPublisher } from '../../src/publishers/orders-publisher.js';
import { FakeBus, FakeRedis, asBus } from './fakes.js';

describe('full-flow: portal → order → invoice → iCount', () => {
  let bus: FakeBus;
  let redis: FakeRedis;

  beforeEach(() => {
    bus = new FakeBus();
    redis = new FakeRedis();
  });

  it('מהגשת טופס בפורטל ועד סנכרון חשבונית ב-iCount', async () => {
    // setup כל ה-adapters
    const portalToOrders = new PortalToOrdersAdapter({
      bus: asBus(bus),
      redis: redis as any,
      orders: {
        async createOrder(input) {
          return {
            orderId: `ord-${input.submissionId}`,
            totalAmount: 5000,
            scheduledDate: '2026-07-15',
          };
        },
      },
    });
    const ordersToEvents = new OrdersToEventsAdapter({
      bus: asBus(bus),
      redis: redis as any,
      scheduler: {
        async scheduleEvent(input) {
          return {
            eventId: `evt-${input.orderId}`,
            venue: 'אולם הכפר',
            guestsCount: 150,
          };
        },
      },
    });
    const ordersToFinance = new OrdersToFinanceAdapter({
      bus: asBus(bus),
      redis: redis as any,
      invoice: {
        async issueInvoice(input) {
          return {
            invoiceId: `inv-${input.orderId}`,
            totalAmount: 5000,
            dueDate: '2026-08-15',
          };
        },
      },
      orders: {
        async getOrder() {
          return {
            customerId: 'cust-99',
            items: [{ description: 'חבילת אירוע VIP', quantity: 1, unitPrice: 5000 }],
          };
        },
      },
    });
    const ordersToKitchen = new OrdersToKitchenAdapter({
      bus: asBus(bus),
      redis: redis as any,
      kitchen: {
        async createPrepTasks() {
          return { taskIds: ['t-1', 't-2', 't-3'] };
        },
      },
      orders: {
        async getOrderItems() {
          return [
            { sku: 'main', name: 'מנה ראשית', quantity: 150 },
            { sku: 'side', name: 'תוספת', quantity: 150 },
          ];
        },
      } as any,
    });
    const financeToIcount = new FinanceToIcountAdapter({
      bus: asBus(bus),
      redis: redis as any,
      icount: {
        async createInvoice() {
          return { icountDocId: 'icount-99', docNumber: '20260715-99' };
        },
        async allocate() {
          return { allocationId: 'alloc-99' };
        },
      },
    });

    await Promise.all([
      portalToOrders.start(),
      ordersToEvents.start(),
      ordersToFinance.start(),
      ordersToKitchen.start(),
      financeToIcount.start(),
    ]);

    // act: לקוח שולח טופס
    const portalPub = new PortalPublisher({ bus: asBus(bus) });
    await portalPub.publishPortalSubmitted({
      submissionId: 'sub-1',
      customerId: 'cust-99',
      formType: 'order',
      data: { eventDate: '2026-07-15', guests: 150 },
    });

    // ההזמנה נוצרה → צריך לפרסם order.approved כדי שיופיעו invoice + kitchen
    const ordersPub = new OrdersPublisher({ bus: asBus(bus) });
    await ordersPub.publishOrderApproved({
      orderId: 'ord-sub-1',
      approvedBy: 'mgr-1',
    });

    // assert: כל האירועים בשרשרת התרחשו
    expect(bus.eventsOfType('portal.submitted')).toHaveLength(1);
    expect(bus.eventsOfType('order.placed')).toHaveLength(1);
    expect(bus.eventsOfType('event.scheduled')).toHaveLength(1);
    expect(bus.eventsOfType('order.approved')).toHaveLength(1);
    expect(bus.eventsOfType('invoice.issued')).toHaveLength(1);

    // verify the chain links match
    const order = bus.eventsOfType('order.placed')[0];
    expect(order.payload.orderId).toBe('ord-sub-1');
    const invoice = bus.eventsOfType('invoice.issued')[0];
    expect(invoice.payload.orderId).toBe('ord-sub-1');
    expect(invoice.payload.invoiceId).toBe('inv-ord-sub-1');

    await Promise.all([
      portalToOrders.stop(),
      ordersToEvents.stop(),
      ordersToFinance.stop(),
      ordersToKitchen.stop(),
      financeToIcount.stop(),
    ]);
  });
});
