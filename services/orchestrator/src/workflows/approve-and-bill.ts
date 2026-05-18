import { cardcomClient, ChargeResult } from '../clients/cardcom';
import { crmClient } from '../clients/crm';
import { icountClient, Invoice } from '../clients/icount';
import { notifyClient } from '../clients/notify';
import { createRun, RunRecord } from '../lib/state';
import { ApproveAndBillInput } from '../types/dto';
import { runSaga, SagaStep } from './saga';

interface Ctx {
  input: ApproveAndBillInput;
  invoice?: Invoice;
  allocationId?: string;
  charge?: ChargeResult;
}

export interface ApproveAndBillResult {
  runId: string;
  ok: boolean;
  invoiceId?: string;
  invoiceDocNumber?: string;
  chargeId?: string;
  approvalNumber?: string;
  allocationId?: string;
  failedStep?: string;
  error?: string;
}

export async function runApproveAndBill(input: ApproveAndBillInput): Promise<{ run: RunRecord; result: ApproveAndBillResult }> {
  const run = createRun('approve-and-bill', { input });

  const steps: SagaStep<Ctx>[] = [
    {
      name: 'approve-quote-and-order',
      action: async (ctx) => {
        // tolerate the order being already approved
        await crmClient.approveQuote(ctx.input.orderId).catch(() => undefined);
        return {};
      },
    },
    {
      name: 'create-invoice',
      action: async (ctx) => {
        const inv = await icountClient.createInvoice({
          customerId: ctx.input.customerId,
          orderId: ctx.input.orderId,
          amount: ctx.input.invoiceAmount,
          vatRate: ctx.input.vatRate,
        });
        return { invoice: inv };
      },
      compensate: async (ctx) => {
        if (ctx.invoice)
          await icountClient.createCreditNote({
            invoiceId: ctx.invoice.id,
            amount: ctx.invoice.amount,
            reason: 'saga-rollback',
          });
      },
    },
    {
      name: 'cardcom-charge',
      action: async (ctx) => {
        const c = await cardcomClient.charge({
          token: ctx.input.paymentToken,
          amount: ctx.input.invoiceAmount,
          currency: ctx.input.currency,
          orderId: ctx.input.orderId,
        });
        if (c.status !== 'approved') throw new Error(`cardcom declined: ${c.id}`);
        return { charge: c };
      },
      compensate: async (ctx) => {
        if (ctx.charge)
          await cardcomClient.refund({ chargeId: ctx.charge.id, amount: ctx.charge.amount }).catch(() => undefined);
      },
    },
    {
      name: 'icount-allocate-payment',
      action: async (ctx) => {
        const a = await icountClient.allocatePayment({
          invoiceId: ctx.invoice!.id,
          paymentId: ctx.charge!.id,
          amount: ctx.charge!.amount,
        });
        return { allocationId: a.allocationId };
      },
    },
    {
      name: 'email-receipt',
      optional: true,
      action: async (ctx) => {
        await notifyClient.send({
          channel: 'email',
          to: ctx.input.notifyEmail ?? 'no-reply@example.com',
          template: 'payment-receipt',
          vars: {
            invoiceDoc: ctx.invoice?.docNumber,
            amount: ctx.charge?.amount,
            approval: ctx.charge?.approvalNumber,
          },
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
      invoiceId: result.ctx.invoice?.id,
      invoiceDocNumber: result.ctx.invoice?.docNumber,
      chargeId: result.ctx.charge?.id,
      approvalNumber: result.ctx.charge?.approvalNumber,
      allocationId: result.ctx.allocationId,
      failedStep: result.failedStep,
      error: result.error,
    },
  };
}
