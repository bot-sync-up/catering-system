import { z } from 'zod';

export const PaymentStatusSchema = z.enum([
  'PENDING',
  'AUTHORIZED',
  'CAPTURED',
  'PAID',
  'PARTIALLY_PAID',
  'FAILED',
  'REFUNDED',
  'CANCELLED',
  'CHARGEBACK',
]);
export const PaymentStatus = PaymentStatusSchema.enum;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const PaymentMethodSchema = z.enum([
  'CASH',
  'CHECK',
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'BIT',
  'PAYBOX',
  'OTHER',
]);
export const PaymentMethod = PaymentMethodSchema.enum;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
