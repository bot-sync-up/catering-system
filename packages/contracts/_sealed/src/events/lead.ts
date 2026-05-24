import { z } from 'zod';
import { DomainEventEnvelopeSchema } from './base.js';
import { LeadIdSchema, EmployeeIdSchema } from '../common/id.js';
import { LeadSourceSchema } from '../entities/Lead.js';

export const LeadCreatedPayloadSchema = z
  .object({
    leadId: LeadIdSchema,
    source: LeadSourceSchema,
    fullName: z.string().min(1),
    ownerId: EmployeeIdSchema.nullable().optional(),
  })
  .strict();
export const LeadCreatedEventSchema = DomainEventEnvelopeSchema(
  'lead.created',
  LeadCreatedPayloadSchema,
);
export type LeadCreatedEvent = z.infer<typeof LeadCreatedEventSchema>;
