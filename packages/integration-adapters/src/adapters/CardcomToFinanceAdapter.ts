/**
 * CardcomToFinanceAdapter - מאזין ל-`payment.captured` ומסמן את החשבונית כשולמה.
 */

import { BaseAdapter, type BaseAdapterOptions, type AdapterContext } from '../BaseAdapter.js';

export interface FinanceClient {
  markInvoicePaid: (input: {
    invoiceId: string;
    paymentId: string;
    amount: number;
  }) => Promise<{ fullyPaid: boolean }>;
}

export interface CardcomToFinanceOptions extends BaseAdapterOptions {
  finance: FinanceClient;
}

export class CardcomToFinanceAdapter extends BaseAdapter<'payment.captured'> {
  readonly name = 'cardcom-to-finance';
  readonly sourceEvent = 'payment.captured' as const;

  constructor(private readonly opts: CardcomToFinanceOptions) {
    super(opts);
  }

  protected async handle(ctx: AdapterContext<'payment.captured'>): Promise<void> {
    const { event } = ctx;
    const res = await this.opts.finance.markInvoicePaid({
      invoiceId: event.payload.invoiceId,
      paymentId: event.payload.paymentId,
      amount: event.payload.amount,
    });

    await this.bus.publish(
      'invoice.paid',
      {
        invoiceId: event.payload.invoiceId,
        paidAt: new Date().toISOString(),
        paymentId: event.payload.paymentId,
        fullyPaid: res.fullyPaid,
      },
      {
        correlationId: event.metadata.correlationId,
        causationId: event.metadata.id,
      },
    );
  }
}
