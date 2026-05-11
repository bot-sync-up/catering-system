import { z } from 'zod';
import {
  DeliveryIdSchema,
  OrderIdSchema,
  EventIdSchema,
  EmployeeIdSchema,
  VehicleIdSchema,
} from '../common/id.js';
import { AddressSchema } from '../common/address.js';
import { TimestampsSchema, IsoDateTimeSchema } from '../common/timestamps.js';
import { DeliveryStatusSchema } from '../enums/DeliveryStatus.js';

export const DeliveryStopSchema = z
  .object({
    sequence: z.number().int().nonnegative(),
    address: AddressSchema,
    plannedArrival: IsoDateTimeSchema.nullable().optional(),
    actualArrival: IsoDateTimeSchema.nullable().optional(),
    signedBy: z.string().max(255).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .strict();
export type DeliveryStop = z.infer<typeof DeliveryStopSchema>;

export const DeliverySchema = z
  .object({
    id: DeliveryIdSchema,
    orderId: OrderIdSchema.nullable().optional(),
    eventId: EventIdSchema.nullable().optional(),
    status: DeliveryStatusSchema.default('PENDING'),
    vehicleId: VehicleIdSchema.nullable().optional(),
    driverId: EmployeeIdSchema.nullable().optional(),
    dispatchedAt: IsoDateTimeSchema.nullable().optional(),
    completedAt: IsoDateTimeSchema.nullable().optional(),
    stops: z.array(DeliveryStopSchema).min(1),
    notes: z.string().max(5000).nullable().optional(),
  })
  .merge(TimestampsSchema)
  .strict();

export type Delivery = z.infer<typeof DeliverySchema>;
