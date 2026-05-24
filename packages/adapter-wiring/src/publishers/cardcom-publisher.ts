/**
 * CardcomPublisher - אירועי תשלום מ-CardCom Gateway.
 *
 * אירועים:
 *  - payment.captured - תשלום הצליח (מופעל ע"י webhook מ-CardCom)
 *  - payment.failed   - תשלום נכשל (decline / timeout / 3DS fail)
 *  - payment.received - הצהרת תשלום כללית (לא רק CardCom - מזוהה ע"י method)
 */

import pino, { type Logger } from 'pino';
import type { EventBus } from '@catering/event-bus';
import type { PublisherBaseOptions, PublishContext } from './types.js';

export interface CardcomPublisherOptions extends PublisherBaseOptions {}

export interface PaymentCapturedInput {
  paymentId: string;
  invoiceId: string;
  amount: number;
  cardcomTransactionId: string;
  capturedAt?: string;
}

export interface PaymentFailedInput {
  paymentId: string;
  invoiceId?: string;
  amount: number;
  reason: string;
  errorCode?: string;
  attemptNumber: number;
  failedAt?: string;
}

export interface PaymentReceivedInput {
  paymentId: string;
  invoiceId?: string;
  orderId?: string;
  amount: number;
  currency?: 'ILS' | 'USD' | 'EUR';
  method: 'credit-card' | 'bank-transfer' | 'cash' | 'check';
  reference: string;
  receivedAt?: string;
}

export class CardcomPublisher {
  private readonly bus: EventBus;
  private readonly logger: Logger;

  constructor(opts: CardcomPublisherOptions) {
    this.bus = opts.bus;
    this.logger = opts.logger ?? pino({ name: 'publisher:cardcom' });
  }

  async publishPaymentCaptured(
    input: PaymentCapturedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.info(
      { paymentId: input.paymentId, amount: input.amount },
      'מפרסם payment.captured',
    );
    return this.bus.publish(
      'payment.captured',
      {
        paymentId: input.paymentId,
        invoiceId: input.invoiceId,
        amount: input.amount,
        cardcomTransactionId: input.cardcomTransactionId,
        capturedAt: input.capturedAt ?? new Date().toISOString(),
      },
      ctx,
    );
  }

  async publishPaymentFailed(
    input: PaymentFailedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.error(
      { paymentId: input.paymentId, reason: input.reason },
      'מפרסם payment.failed',
    );
    return this.bus.publish(
      'payment.failed',
      {
        paymentId: input.paymentId,
        invoiceId: input.invoiceId,
        amount: input.amount,
        reason: input.reason,
        errorCode: input.errorCode,
        attemptNumber: input.attemptNumber,
        failedAt: input.failedAt ?? new Date().toISOString(),
      },
      ctx,
    );
  }

  async publishPaymentReceived(
    input: PaymentReceivedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.info(
      { paymentId: input.paymentId, method: input.method },
      'מפרסם payment.received',
    );
    return this.bus.publish(
      'payment.received',
      {
        paymentId: input.paymentId,
        invoiceId: input.invoiceId,
        orderId: input.orderId,
        amount: input.amount,
        currency: input.currency ?? 'ILS',
        method: input.method,
        reference: input.reference,
        receivedAt: input.receivedAt ?? new Date().toISOString(),
      },
      ctx,
    );
  }
}
