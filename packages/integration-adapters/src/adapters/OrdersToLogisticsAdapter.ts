/**
 * OrdersToLogisticsAdapter - מאזין ל-`event.ready` ויוצר Delivery.
 */

import { BaseAdapter, type BaseAdapterOptions, type AdapterContext } from '../BaseAdapter.js';

export interface LogisticsClient {
  createDelivery: (input: {
    eventId: string;
    orderId: string;
  }) => Promise<{ deliveryId: string; driverId: string; vehicleId: string; eta: string }>;
}

export interface OrdersToLogisticsOptions extends BaseAdapterOptions {
  logistics: LogisticsClient;
}

export class OrdersToLogisticsAdapter extends BaseAdapter<'event.ready'> {
  readonly name = 'orders-to-logistics';
  readonly sourceEvent = 'event.ready' as const;

  constructor(private readonly opts: OrdersToLogisticsOptions) {
    super(opts);
  }

  protected async handle(ctx: AdapterContext<'event.ready'>): Promise<void> {
    const { event } = ctx;
    const delivery = await this.opts.logistics.createDelivery({
      eventId: event.payload.eventId,
      orderId: event.payload.orderId,
    });

    await this.bus.publish(
      'delivery.dispatched',
      {
        deliveryId: delivery.deliveryId,
        eventId: event.payload.eventId,
        orderId: event.payload.orderId,
        driverId: delivery.driverId,
        vehicleId: delivery.vehicleId,
        dispatchedAt: new Date().toISOString(),
        estimatedArrival: delivery.eta,
      },
      {
        correlationId: event.metadata.correlationId,
        causationId: event.metadata.id,
      },
    );
  }
}
