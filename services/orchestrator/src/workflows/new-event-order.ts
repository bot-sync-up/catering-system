import { biClient } from '../clients/bi';
import { crmClient } from '../clients/crm';
import { deliveryClient } from '../clients/delivery';
import { inventoryClient, PurchaseOrder, StockCheck } from '../clients/inventory';
import { kitchenClient, PrepTask } from '../clients/kitchen';
import { notifyClient } from '../clients/notify';
import { staffClient, StaffAssignment } from '../clients/staff';
import { createRun, RunRecord } from '../lib/state';
import { NewEventOrderInput } from '../types/dto';
import { runSaga, SagaStep } from './saga';

interface Ctx {
  input: NewEventOrderInput;
  customerId?: string;
  quoteId?: string;
  orderId?: string;
  eventId?: string;
  prepTasks?: PrepTask[];
  stockChecks?: StockCheck[];
  reservationId?: string;
  purchaseOrders?: PurchaseOrder[];
  staffAssignments?: StaffAssignment[];
  deliveryId?: string;
  notifiedAt?: string;
}

export interface NewEventOrderResult {
  runId: string;
  ok: boolean;
  customerId?: string;
  quoteId?: string;
  orderId?: string;
  eventId?: string;
  reservationId?: string;
  purchaseOrderIds: string[];
  staffAssignmentIds: string[];
  deliveryId?: string;
  failedStep?: string;
  error?: string;
}

export async function runNewEventOrder(input: NewEventOrderInput): Promise<{ run: RunRecord; result: NewEventOrderResult }> {
  const run = createRun('new-event-order', { input });

  const steps: SagaStep<Ctx>[] = [
    {
      name: 'create-or-upsert-customer',
      action: async (ctx) => {
        const c = await crmClient.upsertCustomer(ctx.input.customer);
        return { customerId: c.id };
      },
    },
    {
      name: 'create-quote',
      action: async (ctx) => {
        const q = await crmClient.createQuote({
          customerId: ctx.customerId!,
          amount: ctx.input.quote.amount,
          currency: ctx.input.quote.currency,
          guests: ctx.input.event.guests,
        });
        return { quoteId: q.id };
      },
    },
    {
      name: 'create-order',
      action: async (ctx) => {
        const o = await crmClient.createOrder(ctx.quoteId!);
        return { orderId: o.id };
      },
      compensate: async (ctx) => {
        if (ctx.orderId) await crmClient.cancelOrder(ctx.orderId, 'saga-rollback');
      },
    },
    {
      name: 'schedule-event',
      action: async (ctx) => {
        const evt = await kitchenClient.createEvent({
          orderId: ctx.orderId!,
          date: ctx.input.event.date,
          guests: ctx.input.event.guests,
          venue: ctx.input.event.venue,
        });
        return { eventId: evt.id };
      },
    },
    {
      name: 'plan-prep-tasks',
      action: async (ctx) => {
        const tasks = await kitchenClient.planPrepTasks(ctx.eventId!, ctx.input.menu);
        return { prepTasks: tasks };
      },
    },
    {
      name: 'check-inventory',
      action: async (ctx) => {
        const checks = await inventoryClient.checkStock(ctx.eventId!, ctx.input.ingredients);
        return { stockChecks: checks };
      },
    },
    {
      name: 'reserve-stock',
      action: async (ctx) => {
        const reserveLines = ctx.stockChecks!
          .filter((c) => c.onHand > 0)
          .map((c) => ({ sku: c.sku, qty: Math.min(c.onHand, c.required) }));
        if (reserveLines.length === 0) return { reservationId: undefined };
        const r = await inventoryClient.reserveStock(ctx.eventId!, reserveLines);
        return { reservationId: r.reservationId };
      },
      compensate: async (ctx) => {
        if (ctx.reservationId) await inventoryClient.releaseReservation(ctx.reservationId);
      },
    },
    {
      name: 'create-purchase-orders',
      action: async (ctx) => {
        const pos = await inventoryClient.createPurchaseOrders(ctx.stockChecks ?? []);
        return { purchaseOrders: pos };
      },
      compensate: async (ctx) => {
        for (const po of ctx.purchaseOrders ?? []) {
          await inventoryClient.cancelPurchaseOrder(po.id).catch(() => undefined);
        }
      },
    },
    {
      name: 'assign-staff',
      action: async (ctx) => {
        const a = await staffClient.assignTeam(ctx.eventId!, ctx.input.staffPlan);
        return { staffAssignments: a };
      },
      compensate: async (ctx) => {
        if (ctx.eventId) await staffClient.releaseTeam(ctx.eventId).catch(() => undefined);
      },
    },
    {
      name: 'plan-delivery',
      action: async (ctx) => {
        const d = await deliveryClient.planRoute({
          eventId: ctx.eventId!,
          address: ctx.input.event.address,
          arriveBy: ctx.input.event.arriveBy,
        });
        return { deliveryId: d.id };
      },
      compensate: async (ctx) => {
        if (ctx.deliveryId) await deliveryClient.cancelDelivery(ctx.deliveryId).catch(() => undefined);
      },
    },
    {
      name: 'notify-customer',
      optional: true,
      action: async (ctx) => {
        await notifyClient.send({
          channel: 'email',
          to: ctx.input.customer.email ?? 'no-reply@example.com',
          template: 'event-order-confirmed',
          vars: { orderId: ctx.orderId, eventId: ctx.eventId },
        });
        return { notifiedAt: new Date().toISOString() };
      },
    },
    {
      name: 'track-bi',
      optional: true,
      action: async (ctx) => {
        await biClient.track('event_order_created', {
          orderId: ctx.orderId,
          eventId: ctx.eventId,
          guests: ctx.input.event.guests,
          amount: ctx.input.quote.amount,
        });
        return {};
      },
    },
  ];

  const result = await runSaga<Ctx>(run, { input }, steps);

  return {
    run,
    result: {
      runId: run.id,
      ok: result.ok,
      customerId: result.ctx.customerId,
      quoteId: result.ctx.quoteId,
      orderId: result.ctx.orderId,
      eventId: result.ctx.eventId,
      reservationId: result.ctx.reservationId,
      purchaseOrderIds: (result.ctx.purchaseOrders ?? []).map((p) => p.id),
      staffAssignmentIds: (result.ctx.staffAssignments ?? []).map((s) => s.id),
      deliveryId: result.ctx.deliveryId,
      failedStep: result.failedStep,
      error: result.error,
    },
  };
}
