/**
 * orders-to-events.adapter.ts
 *
 * תפקיד: על `order.approved` עם תאריך אירוע יוצר רשומת אירוע
 * במערכת ה-Events (יומן/לוח שנה) ומפרסם `event.scheduled`.
 * Stub: EventsClient — יחובר ל-Events Service.
 */
import { BaseAdapter, type BaseAdapterOptions } from './BaseAdapter.js';

export interface EventsClient {
  scheduleEvent(input: { orderId: string; scheduledAt: string; venue: string; guests: number }): Promise<string>;
}

export interface OrdersToEventsAdapterOptions extends BaseAdapterOptions {
  events: EventsClient;
  /** מחזיר את פרטי האירוע מההזמנה */
  getEventDetails(orderId: string): Promise<{ scheduledAt: string; venue: string; guests: number } | null>;
}

export class OrdersToEventsAdapter extends BaseAdapter {
  readonly name = 'orders-to-events';
  private readonly events: EventsClient;
  private readonly getEventDetails: OrdersToEventsAdapterOptions['getEventDetails'];

  constructor(opts: OrdersToEventsAdapterOptions) {
    super(opts);
    this.events = opts.events;
    this.getEventDetails = opts.getEventDetails;
  }

  protected register(): void {
    this.on('order.approved', 'schedule-event', async (evt) => {
      const details = await this.getEventDetails(evt.payload.orderId);
      if (!details) {
        this.logger.debug({ orderId: evt.payload.orderId }, 'no event details — skipping');
        return;
      }
      const eventId = await this.events.scheduleEvent({ orderId: evt.payload.orderId, ...details });
      await this.bus.publish('event.scheduled', {
        eventId,
        orderId: evt.payload.orderId,
        scheduledAt: details.scheduledAt,
        venue: details.venue,
        guests: details.guests,
      });
    });
  }
}
