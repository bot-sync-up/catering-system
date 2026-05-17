import { z } from 'zod';
import { VehicleIdSchema, EmployeeIdSchema } from '../common/id.js';
import { TimestampsSchema, IsoDateTimeSchema } from '../common/timestamps.js';

export const VehicleKindSchema = z.enum([
  'CAR',
  'VAN',
  'REFRIGERATED_VAN',
  'TRUCK',
  'MOTORCYCLE',
  'OTHER',
]);
export type VehicleKind = z.infer<typeof VehicleKindSchema>;

export const VehicleStatusSchema = z.enum([
  'AVAILABLE',
  'IN_USE',
  'MAINTENANCE',
  'OUT_OF_SERVICE',
]);
export type VehicleStatus = z.infer<typeof VehicleStatusSchema>;

export const VehicleSchema = z
  .object({
    id: VehicleIdSchema,
    licensePlate: z.string().min(1).max(20),
    kind: VehicleKindSchema,
    status: VehicleStatusSchema.default('AVAILABLE'),
    make: z.string().max(120).nullable().optional(),
    model: z.string().max(120).nullable().optional(),
    year: z.number().int().min(1900).max(2100).nullable().optional(),
    /** קיבולת — בק"ג או מנות */
    capacityKg: z.number().nonnegative().nullable().optional(),
    capacityPortions: z.number().int().nonnegative().nullable().optional(),
    /** נהג נוכחי */
    primaryDriverId: EmployeeIdSchema.nullable().optional(),
    /** תאריך תוקף רישוי / טסט */
    licenseExpiresAt: IsoDateTimeSchema.nullable().optional(),
    insuranceExpiresAt: IsoDateTimeSchema.nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .merge(TimestampsSchema)
  .strict();

export type Vehicle = z.infer<typeof VehicleSchema>;
