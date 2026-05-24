import { z } from 'zod';
import { DomainEventEnvelopeSchema } from './base.js';
import { EventIdSchema, CustomerIdSchema } from '../common/id.js';
import { IsoDateTimeSchema } from '../common/timestamps.js';

export const EventScheduledPayloadSchema = z
  .object({
    eventId: EventIdSchema,
    customerId: CustomerIdSchema,
    startAt: IsoDateTimeSchema,
    endAt: IsoDateTimeSchema,
    headcount: z.number().int().positive(),
  })
  .strict();
export const EventScheduledEventSchema = DomainEventEnvelopeSchema(
  'event.scheduled',
  EventScheduledPayloadSchema,
);
export type EventScheduledEvent = z.infer<typeof EventScheduledEventSchema>;

export const EventCompletedPayloadSchema = z
  .object({
    eventId: EventIdSchema,
    completedAt: IsoDateTimeSchema,
    actualHeadcount: z.number().int().nonnegative().nullable().optional(),
  })
  .strict();
export const EventCompletedEventSchema = DomainEventEnvelopeSchema(
  'event.completed',
  EventCompletedPayloadSchema,
);
export type EventCompletedEvent = z.infer<typeof EventCompletedEventSchema>;
