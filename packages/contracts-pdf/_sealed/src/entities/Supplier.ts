import { z } from 'zod';
import { SupplierIdSchema } from '../common/id.js';
import { AddressSchema } from '../common/address.js';
import { ContactSchema } from '../common/contact.js';
import { TimestampsSchema } from '../common/timestamps.js';

export const SupplierKindSchema = z.enum([
  'FOOD_INGREDIENTS',
  'PACKAGING',
  'BEVERAGES',
  'EQUIPMENT',
  'CLEANING',
  'TRANSPORT',
  'OTHER',
]);
export type SupplierKind = z.infer<typeof SupplierKindSchema>;

export const SupplierSchema = z
  .object({
    id: SupplierIdSchema,
    name: z.string().min(1).max(255),
    legalName: z.string().max(255).nullable().optional(),
    taxId: z
      .string()
      .regex(/^\d{7,9}$/, 'Tax ID must be 7-9 digits')
      .nullable()
      .optional(),
    kind: SupplierKindSchema,
    creditTermsDays: z.number().int().min(0).max(365).default(0),
    isActive: z.boolean().default(true),
    contacts: z.array(ContactSchema).default([]),
    addresses: z.array(AddressSchema).default([]),
    notes: z.string().max(5000).nullable().optional(),
  })
  .merge(TimestampsSchema)
  .strict();

export type Supplier = z.infer<typeof SupplierSchema>;
