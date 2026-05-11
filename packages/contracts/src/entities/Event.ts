import { z } from 'zod';
import {
  CustomerIdSchema,
  EventIdSchema,
  OrderIdSchema,
  EmployeeIdSchema,
} from '../common/id.js';
import { AddressSchema } from '../common/address.js';
import { TimestampsSchema, IsoDateTimeSchema } from '../common/timestamps.js';

export const EventTypeSchema = z.enum([
  'WEDDING',
  'BAR_BAT_MITZVAH',
  'BRIT',
  'CORPORATE',
  'CONFERENCE',
  'HOLIDAY',
  'FUNERAL',
  'PRIVATE_PARTY',
  'INSTITUTIONAL_DAILY',
  'OTHER',
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const EventStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);
export type EventStatus = z.infer<typeof EventStatusSchema>;

export const EventStaffingSchema = z
  .object({
    employeeId: EmployeeIdSchema,
    role: z.string().min(1).max(64),
    startAt: IsoDateTimeSchema,
    endAt: IsoDateTimeSchema,
  })
  .strict();
export type EventStaffing = z.infer<typeof EventStaffingSchema>;

export const EventSchema = z
  .object({
    id: EventIdSchema,
    customerId: CustomerIdSchema,
    orderId: OrderIdSchema.nullable().optional(),
    type: EventTypeSchema,
    status: EventStatusSchema.default('DRAFT'),
    title: z.string().min(1).max(255),
    startAt: IsoDateTimeSchema,
    endAt: IsoDateTimeSchema,
    venue: AddressSchema.nullable().optional(),
    headcount: z.number().int().positive(),
    menuRefs: z.array(z.string().max(255)).default([]),
    staffing: z.array(EventStaffingSchema).default([]),
    notes: z.string().max(5000).nullable().optional(),
    internalNotes: z.string().max(5000).nullable().optional(),
  })
  .merge(TimestampsSchema)
  .strict()
  .superRefine((ev, ctx) => {
    if (new Date(ev.endAt) <= new Date(ev.startAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endAt must be after startAt',
        path: ['endAt'],
      });
    }
  });

export type Event = z.infer<typeof EventSchema>;
