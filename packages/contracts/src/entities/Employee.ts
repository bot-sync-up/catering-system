import { z } from 'zod';
import { EmployeeIdSchema } from '../common/id.js';
import { AddressSchema } from '../common/address.js';
import { TimestampsSchema, IsoDateTimeSchema } from '../common/timestamps.js';
import { MoneySchema } from '../common/money.js';
import { EncryptedFieldSchema } from '../common/encrypted.js';
import { RoleSchema } from '../enums/Role.js';

export const EmploymentTypeSchema = z.enum([
  'FULL_TIME',
  'PART_TIME',
  'HOURLY',
  'CONTRACTOR',
  'SEASONAL',
]);
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;

export const EmployeeStatusSchema = z.enum([
  'ACTIVE',
  'ON_LEAVE',
  'SUSPENDED',
  'TERMINATED',
]);
export type EmployeeStatus = z.infer<typeof EmployeeStatusSchema>;

/**
 * Employee — שדות רגישים (תז, חשבון בנק, שכר) מסומנים כ-Encrypted.
 * הקליינט יקבל לרוב EncryptedField עם masked בלבד.
 */
export const EmployeeSchema = z
  .object({
    id: EmployeeIdSchema,
    firstName: z.string().min(1).max(120),
    lastName: z.string().min(1).max(120),
    displayName: z.string().min(1).max(255),

    /** ת.ז. — תמיד מוצפן */
    nationalId: EncryptedFieldSchema.nullable().optional(),

    email: z.string().email().nullable().optional(),
    phone: z
      .string()
      .regex(/^\+?[0-9\-\s()]{6,30}$/u, 'Invalid phone')
      .nullable()
      .optional(),

    role: RoleSchema,
    employmentType: EmploymentTypeSchema,
    status: EmployeeStatusSchema.default('ACTIVE'),

    /** תאריך תחילת עבודה */
    hiredAt: IsoDateTimeSchema,
    /** תאריך סיום (אם רלוונטי) */
    terminatedAt: IsoDateTimeSchema.nullable().optional(),

    /** שכר בסיס — מוצפן */
    baseSalary: EncryptedFieldSchema.nullable().optional(),
    /** שכר שעתי — לעובדים שעתיים. מועבר בגלוי כי לא נחשב חסוי, אבל ניתן להחליף ל-Encrypted */
    hourlyRate: MoneySchema.nullable().optional(),

    /** פרטי בנק — תמיד מוצפן */
    bankAccount: EncryptedFieldSchema.nullable().optional(),

    address: AddressSchema.nullable().optional(),

    notes: z.string().max(5000).nullable().optional(),
  })
  .merge(TimestampsSchema)
  .strict();

export type Employee = z.infer<typeof EmployeeSchema>;
