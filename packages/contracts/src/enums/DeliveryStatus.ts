import { z } from 'zod';

export const DeliveryStatusSchema = z.enum([
  'PENDING',
  'SCHEDULED',
  'DISPATCHED',
  'IN_TRANSIT',
  'ARRIVED',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);
export const DeliveryStatus = DeliveryStatusSchema.enum;
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;
