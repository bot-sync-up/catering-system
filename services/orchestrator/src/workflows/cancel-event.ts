import { biClient } from '../clients/bi';
import { cardcomClient, RefundResult } from '../clients/cardcom';
import { crmClient } from '../clients/crm';
import { deliveryClient } from '../clients/delivery';
import { icountClient, CreditNote } from '../clients/icount';
import { inventoryClient } from '../clients/inventory';
import { notifyClient } from '../clients/notify';
import { staffClient } from '../clients/staff';
import { createRun, RunRecord } from '../lib/state';
import { CancelEventInput } from '../types/dto';
import { runSaga, SagaStep } from './saga';

interface Ctx {
  input: CancelEventInput;
  orderCancelled?: boolean;
  refund?: RefundResult;
  cancelledPurchaseOrderIds: string[];
  staffReleased?: boolean;
  deliveryCancelled?: boolean;
  creditNote?: CreditNote;
  notifiedAt?: string;
}

export interface CancelEventResult {
  runId: string;
  ok: boolean;
  orderCancelled: boolean;
  refundId?: string;
  cancelledPurchaseOrderIds: string[];
  staffReleased: boolean;
  deliveryCancelled: boolean;
  creditNoteId?: string;
  failedStep?: string;
  error?: string;
}

/**
 * The cancellation workflow is itself a saga of "compensating" actions for a previously-completed
 * order. We still want forward-recovery semantics: if e.g. credit-note fails we must not silently
 * leave a refunded charge un-documented. Each step is best-effort and the orchestrator collects all
 * partial failures so an operator can finish what's left manually.
 */
export async function runCancelEvent(input: CancelEventInput): Promise<{ run: RunRecord; result: CancelEventResult }> {
  const run = createRun('cancel-event', { input });

  const steps: SagaStep<Ctx>[] = [
    {
      name: 'cancel-order',
      action: async (ctx) => {
        await crmClient.cancelOrder(ctx.input.orderId, ctx.input.reason);
        return { orderCancelled: true };
      },
    },
    {
      name: 'refund-payment',
      action: async (ctx) => {
        if (!ctx.input.refund) return {};
        const r = await cardcomClient.refund({
          chargeId: ctx.input.refund.chargeId,
          amount: ctx.input.refund.amount,
        });
        if (r.status !== 'approved') throw new Error(`refund declined for ${ctx.input.refund.chargeId}`);
        return { refund: r };
      },
    },
    {
      name: 'cancel-purchase-orders',
      action: async (ctx) => {
        const cancelled: string[] = [];
        for (const id of ctx.input.purchaseOrderIds) {
          const res = await inventoryClient.cancelPurchaseOrder(id);
          if (res.status === 'cancelled') cancelled.push(id);
        }
        return { cancelledPurchaseOrderIds: cancelled };
      },
    },
    {
      name: 'release-stock-reservation',
      optional: true,
      action: async (ctx) => {
        if (ctx.input.reservationId) await inventoryClient.releaseReservation(ctx.input.reservationId);
        return {};
      },
    },
    {
      name: 'release-staff',
      action: async (ctx) => {
        await staffClient.releaseTeam(ctx.input.eventId);
        return { staffReleased: true };
      },
    },
    {
      name: 'cancel-delivery',
      optional: true,
      action: async (ctx) => {
        if (ctx.input.deliveryId) {
          await deliveryClient.cancelDelivery(ctx.input.deliveryId);
          return { deliveryCancelled: true };
        }
        return {};
      },
    },
    {
      name: 'issue-credit-note',
      action: async (ctx) => {
        if (!ctx.input.invoiceId || !ctx.input.refund) return {};
        const cn = await icountClient.createCreditNote({
          invoiceId: ctx.input.invoiceId,
          amount: ctx.input.refund.amount,
          reason: ctx.input.reason,
        });
        return { creditNote: cn };
      },
    },
    {
      name: 'notify-customer',
      optional: true,
      action: async (ctx) => {
        await notifyClient.send({
          channel: 'email',
          to: ctx.input.notifyEmail ?? 'no-reply@example.com',
          template: 'event-cancelled',
          vars: {
            orderId: ctx.input.orderId,
            eventId: ctx.input.eventId,
            refundAmount: ctx.refund?.amount,
            creditNoteDoc: ctx.creditNote?.docNumber,
          },
        });
        return { notifiedAt: new Date().toISOString() };
      },
    },
    {
      name: 'track-bi-cancellation',
      optional: true,
      action: async (ctx) => {
        await biClient.track('event_cancelled', {
          orderId: ctx.input.orderId,
          eventId: ctx.input.eventId,
          reason: ctx.input.reason,
          refundId: ctx.refund?.id,
          creditNoteId: ctx.creditNote?.id,
        });
        return {};
      },
    },
  ];

  const result = await runSaga<Ctx>(run, { input, cancelledPurchaseOrderIds: [] }, steps);

  return {
    run,
    result: {
      runId: run.id,
      ok: result.ok,
      orderCancelled: !!result.ctx.orderCancelled,
      refundId: result.ctx.refund?.id,
      cancelledPurchaseOrderIds: result.ctx.cancelledPurchaseOrderIds,
      staffReleased: !!result.ctx.staffReleased,
      deliveryCancelled: !!result.ctx.deliveryCancelled,
      creditNoteId: result.ctx.creditNote?.id,
      failedStep: result.failedStep,
      error: result.error,
    },
  };
}
