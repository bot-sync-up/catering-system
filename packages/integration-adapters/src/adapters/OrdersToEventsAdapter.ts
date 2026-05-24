/**
 * OrdersToEventsAdapter - מאזין ל-`order.placed` ויוצר Event בלוח האירועים.
 */

import { BaseAdapter, type BaseAdapterOptions, type AdapterContext } from '../BaseAdapter.js';

export interface EventsScheduler {
  scheduleEvent: (input: {
    orderId: string;
    customerId: string;
    scheduledDate: string;
    venue?: string;
    guestsCount?: number;
  }) => Promise<{ eventId: string; venue: string; guestsCount: number }>;
}

export interface OrdersToEventsOptions extends BaseAdapterOptions {
  scheduler: EventsScheduler;
}

export class OrdersToEventsAdapter extends BaseAdapter<'order.placed'> {
  readonly name = 'orders-to-events';
  readonly sourceEvent = 'order.placed' as const;

  constructor(private readonly opts: OrdersToEventsOptions) {
    super(opts);
  }

  protected async handle(ctx: AdapterContext<'order.placed'>): Promise<void> {
    const { event } = ctx;
    const scheduled = await this.opts.scheduler.scheduleEvent({
      orderId: event.payload.orderId,
      customerId: event.payload.customerId,
      scheduledDate: event.payload.scheduledDate,
    });

    await this.bus.publish(
      'event.scheduled',
      {
        eventId: scheduled.eventId,
        orderId: event.payload.orderId,
        customerId: event.payload.customerId,
        scheduledDate: event.payload.scheduledDate,
        venue: scheduled.venue,
        guestsCount: scheduled.guestsCount,
        eventType: 'catering',
      },
      {
        correlationId: event.metadata.correlationId,
        causationId: event.metadata.id,
      },
    );
  }
}
