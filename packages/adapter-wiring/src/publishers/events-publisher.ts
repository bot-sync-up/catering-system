/**
 * EventsPublisher - אירועי "Event" (אירועי קייטרינג עצמם).
 *
 * אירועים:
 *  - event.scheduled - שיבוץ אירוע ביומן (אחרי order.placed → adapter)
 *  - event.ready     - אירוע מוכן לאספקה (kitchen finished)
 *  - event.completed - אירוע הסתיים (סיום ההגשה ע"י צוות)
 */

import pino, { type Logger } from 'pino';
import type { EventBus } from '@catering/event-bus';
import type { PublisherBaseOptions, PublishContext } from './types.js';

export interface EventsPublisherOptions extends PublisherBaseOptions {}

export interface EventScheduledInput {
  eventId: string;
  orderId: string;
  customerId: string;
  scheduledDate: string;
  venue: string;
  guestsCount: number;
  eventType: string;
}

export interface EventReadyInput {
  eventId: string;
  orderId: string;
  readyAt?: string;
}

export interface EventCompletedInput {
  eventId: string;
  completedAt?: string;
  actualGuests?: number;
  notes?: string;
}

export class EventsPublisher {
  private readonly bus: EventBus;
  private readonly logger: Logger;

  constructor(opts: EventsPublisherOptions) {
    this.bus = opts.bus;
    this.logger = opts.logger ?? pino({ name: 'publisher:events' });
  }

  async publishEventScheduled(
    input: EventScheduledInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.info({ eventId: input.eventId }, 'מפרסם event.scheduled');
    return this.bus.publish('event.scheduled', input, ctx);
  }

  async publishEventReady(
    input: EventReadyInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.info({ eventId: input.eventId }, 'מפרסם event.ready');
    return this.bus.publish(
      'event.ready',
      {
        eventId: input.eventId,
        orderId: input.orderId,
        readyAt: input.readyAt ?? new Date().toISOString(),
      },
      ctx,
    );
  }

  async publishEventCompleted(
    input: EventCompletedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.info({ eventId: input.eventId }, 'מפרסם event.completed');
    return this.bus.publish(
      'event.completed',
      {
        eventId: input.eventId,
        completedAt: input.completedAt ?? new Date().toISOString(),
        actualGuests: input.actualGuests,
        notes: input.notes,
      },
      ctx,
    );
  }
}
