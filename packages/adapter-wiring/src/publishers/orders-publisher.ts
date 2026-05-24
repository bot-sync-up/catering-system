/**
 * OrdersPublisher - אירועי הזמנות.
 *
 * אירועים:
 *  - order.placed     - הזמנה נוצרה (קוראים אחרי prisma.order.create)
 *  - order.approved   - הזמנה אושרה (אחרי prisma.order.update status=APPROVED)
 *  - order.cancelled  - הזמנה בוטלה (אחרי soft delete / status=CANCELLED)
 */

import pino, { type Logger } from 'pino';
import type { EventBus } from '@catering/event-bus';
import type { PublisherBaseOptions, PublishContext } from './types.js';

export interface OrdersPublisherOptions extends PublisherBaseOptions {}

export interface OrderPlacedInput {
  orderId: string;
  quoteId?: string;
  customerId: string;
  eventId?: string;
  totalAmount: number;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
  }>;
  scheduledDate: string;
  deliveryAddress?: string;
}

export interface OrderApprovedInput {
  orderId: string;
  approvedBy: string;
  approvedAt?: string;
}

export interface OrderCancelledInput {
  orderId: string;
  reason: string;
  cancelledBy: string;
  cancelledAt?: string;
  refundRequired: boolean;
}

export class OrdersPublisher {
  private readonly bus: EventBus;
  private readonly logger: Logger;

  constructor(opts: OrdersPublisherOptions) {
    this.bus = opts.bus;
    this.logger = opts.logger ?? pino({ name: 'publisher:orders' });
  }

  async publishOrderPlaced(
    input: OrderPlacedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.debug({ orderId: input.orderId }, 'מפרסם order.placed');
    return this.bus.publish('order.placed', input, ctx);
  }

  async publishOrderApproved(
    input: OrderApprovedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.debug({ orderId: input.orderId }, 'מפרסם order.approved');
    return this.bus.publish(
      'order.approved',
      {
        orderId: input.orderId,
        approvedBy: input.approvedBy,
        approvedAt: input.approvedAt ?? new Date().toISOString(),
      },
      ctx,
    );
  }

  async publishOrderCancelled(
    input: OrderCancelledInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.warn(
      { orderId: input.orderId, reason: input.reason },
      'מפרסם order.cancelled',
    );
    return this.bus.publish(
      'order.cancelled',
      {
        orderId: input.orderId,
        reason: input.reason,
        cancelledBy: input.cancelledBy,
        cancelledAt: input.cancelledAt ?? new Date().toISOString(),
        refundRequired: input.refundRequired,
      },
      ctx,
    );
  }
}
