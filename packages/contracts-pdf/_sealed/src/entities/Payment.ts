import { z } from 'zod';
import {
  PaymentIdSchema,
  CustomerIdSchema,
  OrderIdSchema,
  InvoiceIdSchema,
} from '../common/id.js';
import { MoneySchema } from '../common/money.js';
import { TimestampsSchema, IsoDateTimeSchema } from '../common/timestamps.js';
import {
  PaymentStatusSchema,
  PaymentMethodSchema,
} from '../enums/PaymentStatus.js';

export const PaymentSchema = z
  .object({
    id: PaymentIdSchema,
    customerId: CustomerIdSchema,
    orderId: OrderIdSchema.nullable().optional(),
    invoiceId: InvoiceIdSchema.nullable().optional(),
    status: PaymentStatusSchema.default('PENDING'),
    method: PaymentMethodSchema,
    amount: MoneySchema,
    externalReference: z.string().max(255).nullable().optional(),
    last4: z.string().regex(/^\d{4}$/).nullable().optional(),
    paidAt: IsoDateTimeSchema.nullable().optional(),
    failureReason: z.string().max(2000).nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .merge(TimestampsSchema)
  .strict()
  .superRefine((p, ctx) => {
    if (p.status === 'PAID' && !p.paidAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'PAID payment requires paidAt',
        path: ['paidAt'],
      });
    }
  });

export type Payment = z.infer<typeof PaymentSchema>;
