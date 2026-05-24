/**
 * KitchenPublisher - אירועי מטבח.
 *
 * אירועים:
 *  - prep.completed - מטבח סיים הכנה (ממופה ל-event.ready ש-logistics מאזין לו)
 *
 * הערה: prep.completed לא קיים ב-DomainEventMap. ממופה ל-event.ready
 * כי הטריגר היחיד ל-delivery הוא שהאוכל מוכן.
 */

import pino, { type Logger } from 'pino';
import type { EventBus } from '@catering/event-bus';
import type { PublisherBaseOptions, PublishContext } from './types.js';

export interface KitchenPublisherOptions extends PublisherBaseOptions {}

export interface PrepCompletedInput {
  eventId: string;
  orderId: string;
  preparedBy: string;
  completedAt?: string;
  notes?: string;
}

export class KitchenPublisher {
  private readonly bus: EventBus;
  private readonly logger: Logger;

  constructor(opts: KitchenPublisherOptions) {
    this.bus = opts.bus;
    this.logger = opts.logger ?? pino({ name: 'publisher:kitchen' });
  }

  async publishPrepCompleted(
    input: PrepCompletedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.info(
      { eventId: input.eventId, orderId: input.orderId },
      'מפרסם prep.completed (כ-event.ready)',
    );
    return this.bus.publish(
      'event.ready',
      {
        eventId: input.eventId,
        orderId: input.orderId,
        readyAt: input.completedAt ?? new Date().toISOString(),
      },
      ctx,
    );
  }
}
