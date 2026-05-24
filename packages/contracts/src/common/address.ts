import { z } from 'zod';
import { AddressIdSchema } from './id.js';

/** סוג כתובת */
export const AddressKindSchema = z.enum([
  'BILLING',
  'SHIPPING',
  'EVENT',
  'OFFICE',
  'HOME',
  'OTHER',
]);
export type AddressKind = z.infer<typeof AddressKindSchema>;

export const AddressSchema = z
  .object({
    id: AddressIdSchema,
    kind: AddressKindSchema.default('OTHER'),
    line1: z.string().min(1).max(255),
    line2: z.string().max(255).nullable().optional(),
    city: z.string().min(1).max(120),
    region: z.string().max(120).nullable().optional(),
    postalCode: z.string().max(20).nullable().optional(),
    country: z.string().length(2).default('IL'), // ISO 3166-1 alpha-2
    notes: z.string().max(1000).nullable().optional(),
    geo: z
      .object({
        lat: z.number().gte(-90).lte(90),
        lng: z.number().gte(-180).lte(180),
      })
      .nullable()
      .optional(),
  })
  .strict();

export type Address = z.infer<typeof AddressSchema>;
