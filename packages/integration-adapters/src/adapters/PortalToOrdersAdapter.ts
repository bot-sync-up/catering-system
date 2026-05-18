/**
 * PortalToOrdersAdapter - מאזין ל-`portal.submitted` ויוצר Order חדש.
 */

import { BaseAdapter, type BaseAdapterOptions, type AdapterContext } from '../BaseAdapter.js';

export interface OrdersClient {
  createOrder: (input: {
    submissionId: string;
    customerId: string;
    formData: Record<string, unknown>;
  }) => Promise<{ orderId: string; totalAmount: number; scheduledDate: string }>;
}

export interface PortalToOrdersOptions extends BaseAdapterOptions {
  orders: OrdersClient;
}

export class PortalToOrdersAdapter extends BaseAdapter<'portal.submitted'> {
  readonly name = 'portal-to-orders';
  readonly sourceEvent = 'portal.submitted' as const;

  constructor(private readonly opts: PortalToOrdersOptions) {
    super(opts);
  }

  protected async handle(ctx: AdapterContext<'portal.submitted'>): Promise<void> {
    const { event } = ctx;
    if (event.payload.formType !== 'order' && event.payload.formType !== 'event-booking') {
      this.logger.debug(
        { eventId: event.metadata.id, formType: event.payload.formType },
        'מתעלמים מסוג טופס שאינו order',
      );
      return;
    }

    const order = await this.opts.orders.createOrder({
      submissionId: event.payload.submissionId,
      customerId: event.payload.customerId,
      formData: event.payload.data,
    });

    await this.bus.publish(
      'order.placed',
      {
        orderId: order.orderId,
        customerId: event.payload.customerId,
        totalAmount: order.totalAmount,
        items: [],
        scheduledDate: order.scheduledDate,
      },
      {
        correlationId: event.metadata.correlationId,
        causationId: event.metadata.id,
      },
    );
  }
}
