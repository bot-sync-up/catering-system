import { z } from 'zod';
import {
  CustomerIdSchema,
  AddressSchema,
  ContactSchema,
  TagSchema,
} from '../common/index.js';
import { TimestampsSchema } from '../common/timestamps.js';

/** סוג לקוח: עסקי, פרטי, מוסדי */
export const CustomerTypeSchema = z.enum(['B2B', 'B2C', 'INSTITUTION']);
export const CustomerType = CustomerTypeSchema.enum;
export type CustomerType = z.infer<typeof CustomerTypeSchema>;

/** מצב חשבון הלקוח */
export const CustomerStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'BLOCKED',
  'PROSPECT',
]);
export type CustomerStatus = z.infer<typeof CustomerStatusSchema>;

export const CustomerSchema = z
  .object({
    id: CustomerIdSchema,
    type: CustomerTypeSchema,
    status: CustomerStatusSchema.default('ACTIVE'),

    /** שם תצוגה (פרטי או עסקי) */
    displayName: z.string().min(1).max(255),

    /** שם משפטי — לחיוב ולמסמכים רשמיים */
    legalName: z.string().max(255).nullable().optional(),

    /** ח.פ / ע.מ / ת.ז. */
    taxId: z
      .string()
      .regex(/^\d{7,9}$/, 'Tax ID must be 7-9 digits')
      .nullable()
      .optional(),

    /** שם המוסד (אם INSTITUTION) — בית ספר, ישיבה, צה"ל וכו' */
    institutionName: z.string().max(255).nullable().optional(),

    contacts: z.array(ContactSchema).default([]),
    addresses: z.array(AddressSchema).default([]),
    tags: z.array(TagSchema).default([]),

    /** מס׳ ימי אשראי */
    creditTermsDays: z.number().int().min(0).max(365).default(0),

    notes: z.string().max(5000).nullable().optional(),
  })
  .merge(TimestampsSchema)
  .strict();

export type Customer = z.infer<typeof CustomerSchema>;

export const CreateCustomerSchema = CustomerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = CreateCustomerSchema.partial();
export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;
