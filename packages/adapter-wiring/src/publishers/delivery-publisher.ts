/**
 * DeliveryPublisher - אירועי משלוחים ולוגיסטיקה.
 *
 * אירועים:
 *  - delivery.dispatched - משלוח יצא לדרך (driver clicked "התחלת נסיעה")
 *  - delivery.completed  - משלוח הושלם (signed by recipient)
 */

import pino, { type Logger } from 'pino';
import type { EventBus } from '@catering/event-bus';
import type { PublisherBaseOptions, PublishContext } from './types.js';

export interface DeliveryPublisherOptions extends PublisherBaseOptions {}

export interface DeliveryDispatchedInput {
  deliveryId: string;
  eventId?: string;
  orderId: string;
  driverId: string;
  vehicleId: string;
  dispatchedAt?: string;
  estimatedArrival: string;
}

export interface DeliveryCompletedInput {
  deliveryId: string;
  completedAt?: string;
  signedBy?: string;
  notes?: string;
}

export class DeliveryPublisher {
  private readonly bus: EventBus;
  private readonly logger: Logger;

  constructor(opts: DeliveryPublisherOptions) {
    this.bus = opts.bus;
    this.logger = opts.logger ?? pino({ name: 'publisher:delivery' });
  }

  async publishDeliveryDispatched(
    input: DeliveryDispatchedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.info(
      { deliveryId: input.deliveryId, driverId: input.driverId },
      'מפרסם delivery.dispatched',
    );
    return this.bus.publish(
      'delivery.dispatched',
      {
        deliveryId: input.deliveryId,
        eventId: input.eventId,
        orderId: input.orderId,
        driverId: input.driverId,
        vehicleId: input.vehicleId,
        dispatchedAt: input.dispatchedAt ?? new Date().toISOString(),
        estimatedArrival: input.estimatedArrival,
      },
      ctx,
    );
  }

  async publishDeliveryCompleted(
    input: DeliveryCompletedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.info({ deliveryId: input.deliveryId }, 'מפרסם delivery.completed');
    return this.bus.publish(
      'delivery.completed',
      {
        deliveryId: input.deliveryId,
        completedAt: input.completedAt ?? new Date().toISOString(),
        signedBy: input.signedBy,
        notes: input.notes,
      },
      ctx,
    );
  }
}
