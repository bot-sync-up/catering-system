/**
 * IcountPublisher - אירועים שמגיעים ממערכת iCount (קבלות, allocations).
 *
 * אירועים:
 *  - allocation.received - הקצאה התקבלה מ-iCount (mapping: payment.received)
 *
 * הערה: allocation.received אינו ב-DomainEventMap. ממופה ל-payment.received
 * עם method='bank-transfer' כי iCount מסונכרן רק לאחר שהתשלום נכנס לבנק.
 */

import pino, { type Logger } from 'pino';
import type { EventBus } from '@catering/event-bus';
import type { PublisherBaseOptions, PublishContext } from './types.js';

export interface IcountPublisherOptions extends PublisherBaseOptions {}

export interface AllocationReceivedInput {
  allocationId: string;
  icountDocId: string;
  invoiceId?: string;
  amount: number;
  receivedAt?: string;
}

export class IcountPublisher {
  private readonly bus: EventBus;
  private readonly logger: Logger;

  constructor(opts: IcountPublisherOptions) {
    this.bus = opts.bus;
    this.logger = opts.logger ?? pino({ name: 'publisher:icount' });
  }

  async publishAllocationReceived(
    input: AllocationReceivedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.info(
      { allocationId: input.allocationId, amount: input.amount },
      'מפרסם allocation.received (כ-payment.received)',
    );
    return this.bus.publish(
      'payment.received',
      {
        paymentId: input.allocationId,
        invoiceId: input.invoiceId,
        amount: input.amount,
        currency: 'ILS',
        method: 'bank-transfer',
        reference: `icount:${input.icountDocId}`,
        receivedAt: input.receivedAt ?? new Date().toISOString(),
      },
      ctx,
    );
  }
}
