import { z } from 'zod';
import { ContactIdSchema } from './id.js';

export const ContactRoleSchema = z.enum([
  'OWNER',
  'MANAGER',
  'BILLING',
  'OPERATIONS',
  'EVENTS',
  'OTHER',
]);
export type ContactRole = z.infer<typeof ContactRoleSchema>;

export const ContactSchema = z
  .object({
    id: ContactIdSchema,
    fullName: z.string().min(1).max(200),
    role: ContactRoleSchema.default('OTHER'),
    email: z.string().email().nullable().optional(),
    phone: z
      .string()
      .regex(/^\+?[0-9\-\s()]{6,30}$/u, 'Invalid phone format')
      .nullable()
      .optional(),
    isPrimary: z.boolean().default(false),
    notes: z.string().max(1000).nullable().optional(),
  })
  .strict();

export type Contact = z.infer<typeof ContactSchema>;
