/**
 * FinanceToCardcomAdapter - מאזין ל-`invoice.due` ויוצר חיוב ב-CardCom.
 */

import { BaseAdapter, type BaseAdapterOptions, type AdapterContext } from '../BaseAdapter.js';

export interface CardcomClient {
  chargeStoredCard: (input: {
    customerId: string;
    amount: number;
    invoiceRef: string;
  }) => Promise<{ transactionId: string; status: 'captured' | 'pending' | 'failed' }>;
}

export interface FinanceToCardcomOptions extends BaseAdapterOptions {
  cardcom: CardcomClient;
}

export class FinanceToCardcomAdapter extends BaseAdapter<'invoice.due'> {
  readonly name = 'finance-to-cardcom';
  readonly sourceEvent = 'invoice.due' as const;

  constructor(private readonly opts: FinanceToCardcomOptions) {
    super(opts);
  }

  protected async handle(ctx: AdapterContext<'invoice.due'>): Promise<void> {
    const { event } = ctx;
    const result = await this.opts.cardcom.chargeStoredCard({
      customerId: event.payload.customerId,
      amount: event.payload.amount,
      invoiceRef: event.payload.invoiceId,
    });

    if (result.status === 'failed') {
      await this.bus.publish(
        'payment.failed',
        {
          paymentId: result.transactionId,
          invoiceId: event.payload.invoiceId,
          amount: event.payload.amount,
          reason: 'CardCom rejected charge',
          attemptNumber: ctx.attempt,
          failedAt: new Date().toISOString(),
        },
        {
          correlationId: event.metadata.correlationId,
          causationId: event.metadata.id,
        },
      );
      throw new Error('CardCom decline - יופעל retry');
    }

    if (result.status === 'captured') {
      await this.bus.publish(
        'payment.captured',
        {
          paymentId: result.transactionId,
          invoiceId: event.payload.invoiceId,
          amount: event.payload.amount,
          cardcomTransactionId: result.transactionId,
          capturedAt: new Date().toISOString(),
        },
        {
          correlationId: event.metadata.correlationId,
          causationId: event.metadata.id,
        },
      );
    }
  }
}
