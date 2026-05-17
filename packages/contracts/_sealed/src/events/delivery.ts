import { z } from 'zod';
import { DomainEventEnvelopeSchema } from './base.js';
import {
  DeliveryIdSchema,
  EmployeeIdSchema,
  VehicleIdSchema,
} from '../common/id.js';
import { IsoDateTimeSchema } from '../common/timestamps.js';

export const DeliveryDispatchedPayloadSchema = z
  .object({
    deliveryId: DeliveryIdSchema,
    vehicleId: VehicleIdSchema.nullable().optional(),
    driverId: EmployeeIdSchema.nullable().optional(),
    dispatchedAt: IsoDateTimeSchema,
  })
  .strict();
export const DeliveryDispatchedEventSchema = DomainEventEnvelopeSchema(
  'delivery.dispatched',
  DeliveryDispatchedPayloadSchema,
);
export type DeliveryDispatchedEvent = z.infer<
  typeof DeliveryDispatchedEventSchema
>;

export const DeliveryCompletedPayloadSchema = z
  .object({
    deliveryId: DeliveryIdSchema,
    completedAt: IsoDateTimeSchema,
    signedBy: z.string().max(255).nullable().optional(),
  })
  .strict();
export const DeliveryCompletedEventSchema = DomainEventEnvelopeSchema(
  'delivery.completed',
  DeliveryCompletedPayloadSchema,
);
export type DeliveryCompletedEvent = z.infer<
  typeof DeliveryCompletedEventSchema
>;
