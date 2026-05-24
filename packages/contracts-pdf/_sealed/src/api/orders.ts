import { z } from 'zod';
import {
  CustomerIdSchema,
  OrderIdSchema,
  PaymentIdSchema,
} from '../common/id.js';
import { MoneySchema } from '../common/money.js';
import { IsoDateTimeSchema } from '../common/timestamps.js';
import { AddressSchema } from '../common/address.js';
import {
  OrderSchema,
  OrderTypeSchema,
  OrderLineItemSchema,
} from '../entities/Order.js';
import { PaymentSchema } from '../entities/Payment.js';
import { PaymentMethodSchema } from '../enums/PaymentStatus.js';

export const CreateOrderInputSchema = z
  .object({
    customerId: CustomerIdSchema,
    type: OrderTypeSchema,
    items: z
      .array(
        OrderLineItemSchema.omit({ id: true, lineTotal: true }).extend({
          // ID יופק בשרת
        }),
      )
      .min(1),
    headcount: z.number().int().positive().nullable().optional(),
    deliveryAddress: AddressSchema.omit({ id: true }).nullable().optional(),
    scheduledFor: IsoDateTimeSchema.nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .strict();
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;
export const CreateOrderOutputSchema = OrderSchema;
export type CreateOrderOutput = z.infer<typeof CreateOrderOutputSchema>;

export const PayOrderInputSchema = z
  .object({
    orderId: OrderIdSchema,
    method: PaymentMethodSchema,
    amount: MoneySchema,
    externalReference: z.string().max(255).nullable().optional(),
    last4: z.string().regex(/^\d{4}$/).nullable().optional(),
  })
  .strict();
export type PayOrderInput = z.infer<typeof PayOrderInputSchema>;

export const PayOrderOutputSchema = z
  .object({
    payment: PaymentSchema,
    order: OrderSchema,
  })
  .strict();
export type PayOrderOutput = z.infer<typeof PayOrderOutputSchema>;

export const ApproveOrderInputSchema = z
  .object({
    orderId: OrderIdSchema,
  })
  .strict();
export type ApproveOrderInput = z.infer<typeof ApproveOrderInputSchema>;

export const CancelOrderInputSchema = z
  .object({
    orderId: OrderIdSchema,
    reason: z.string().max(2000).nullable().optional(),
  })
  .strict();
export type CancelOrderInput = z.infer<typeof CancelOrderInputSchema>;

export const RefundOrderInputSchema = z
  .object({
    orderId: OrderIdSchema,
    paymentId: PaymentIdSchema.nullable().optional(),
    amount: MoneySchema.nullable().optional(),
    reason: z.string().max(2000).nullable().optional(),
  })
  .strict();
export type RefundOrderInput = z.infer<typeof RefundOrderInputSchema>;
