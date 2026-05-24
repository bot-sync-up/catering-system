import { z } from 'zod';
import {
  CustomerIdSchema,
  EventIdSchema,
  OrderIdSchema,
  EmployeeIdSchema,
} from '../common/id.js';
import { AddressSchema } from '../common/address.js';
import { IsoDateTimeSchema } from '../common/timestamps.js';
import { EventSchema, EventTypeSchema } from '../entities/Event.js';

export const ScheduleEventInputSchema = z
  .object({
    customerId: CustomerIdSchema,
    orderId: OrderIdSchema.nullable().optional(),
    type: EventTypeSchema,
    title: z.string().min(1).max(255),
    startAt: IsoDateTimeSchema,
    endAt: IsoDateTimeSchema,
    headcount: z.number().int().positive(),
    venue: AddressSchema.omit({ id: true }).nullable().optional(),
    menuRefs: z.array(z.string().max(255)).default([]),
    notes: z.string().max(5000).nullable().optional(),
  })
  .strict();
export type ScheduleEventInput = z.infer<typeof ScheduleEventInputSchema>;
export const ScheduleEventOutputSchema = EventSchema;
export type ScheduleEventOutput = z.infer<typeof ScheduleEventOutputSchema>;

export const AssignStaffInputSchema = z
  .object({
    eventId: EventIdSchema,
    employeeId: EmployeeIdSchema,
    role: z.string().min(1).max(64),
    startAt: IsoDateTimeSchema,
    endAt: IsoDateTimeSchema,
  })
  .strict();
export type AssignStaffInput = z.infer<typeof AssignStaffInputSchema>;

export const CompleteEventInputSchema = z
  .object({
    eventId: EventIdSchema,
    actualHeadcount: z.number().int().nonnegative().nullable().optional(),
  })
  .strict();
export type CompleteEventInput = z.infer<typeof CompleteEventInputSchema>;
