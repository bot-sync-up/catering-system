import { z } from 'zod';
import { LeadIdSchema, CustomerIdSchema, EmployeeIdSchema } from '../common/id.js';
import { TimestampsSchema, IsoDateTimeSchema } from '../common/timestamps.js';

export const LeadSourceSchema = z.enum([
  'WEB',
  'PHONE',
  'WHATSAPP',
  'REFERRAL',
  'INSTAGRAM',
  'FACEBOOK',
  'WALK_IN',
  'OTHER',
]);
export type LeadSource = z.infer<typeof LeadSourceSchema>;

export const LeadStatusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
]);
export type LeadStatus = z.infer<typeof LeadStatusSchema>;

export const LeadSchema = z
  .object({
    id: LeadIdSchema,
    fullName: z.string().min(1).max(255),
    email: z.string().email().nullable().optional(),
    phone: z
      .string()
      .regex(/^\+?[0-9\-\s()]{6,30}$/u, 'Invalid phone')
      .nullable()
      .optional(),
    source: LeadSourceSchema,
    status: LeadStatusSchema.default('NEW'),
    /** אם הוסב ללקוח */
    convertedCustomerId: CustomerIdSchema.nullable().optional(),
    /** איש מכירות אחראי */
    ownerId: EmployeeIdSchema.nullable().optional(),
    /** אומדן ערך עסקה צפוי */
    estimatedValue: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Estimated value must be decimal')
      .nullable()
      .optional(),
    expectedCloseAt: IsoDateTimeSchema.nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .merge(TimestampsSchema)
  .strict();

export type Lead = z.infer<typeof LeadSchema>;
