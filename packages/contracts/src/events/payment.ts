import { z } from 'zod';
import { DomainEventEnvelopeSchema } from './base.js';
import {
  PaymentIdSchema,
  OrderIdSchema,
  InvoiceIdSchema,
  CustomerIdSchema,
} from '../common/id.js';
import { MoneySchema } from '../common/money.js';
import { PaymentMethodSchema } from '../enums/PaymentStatus.js';

export const PaymentReceivedPayloadSchema = z
  .object({
    paymentId: PaymentIdSchema,
    customerId: CustomerIdSchema,
    orderId: OrderIdSchema.nullable().optional(),
    invoiceId: InvoiceIdSchema.nullable().optional(),
    amount: MoneySchema,
    method: PaymentMethodSchema,
  })
  .strict();
export const PaymentReceivedEventSchema = DomainEventEnvelopeSchema(
  'payment.received',
  PaymentReceivedPayloadSchema,
);
export type PaymentReceivedEvent = z.infer<typeof PaymentReceivedEventSchema>;

export const PaymentFailedPayloadSchema = z
  .object({
    paymentId: PaymentIdSchema,
    customerId: CustomerIdSchema,
    amount: MoneySchema,
    reason: z.string().max(2000),
  })
  .strict();
export const PaymentFailedEventSchema = DomainEventEnvelopeSchema(
  'payment.failed',
  PaymentFailedPayloadSchema,
);
export type PaymentFailedEvent = z.infer<typeof PaymentFailedEventSchema>;
