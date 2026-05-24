import { z } from 'zod';
import { DomainEventEnvelopeSchema } from './base.js';
import { OrderIdSchema, CustomerIdSchema, EmployeeIdSchema } from '../common/id.js';
import { MoneySchema } from '../common/money.js';
import { OrderTypeSchema } from '../entities/Order.js';

export const OrderPlacedPayloadSchema = z
  .object({
    orderId: OrderIdSchema,
    customerId: CustomerIdSchema,
    type: OrderTypeSchema,
    grandTotal: MoneySchema,
  })
  .strict();
export const OrderPlacedEventSchema = DomainEventEnvelopeSchema(
  'order.placed',
  OrderPlacedPayloadSchema,
);
export type OrderPlacedEvent = z.infer<typeof OrderPlacedEventSchema>;

export const OrderApprovedPayloadSchema = z
  .object({
    orderId: OrderIdSchema,
    approvedBy: EmployeeIdSchema.nullable().optional(),
  })
  .strict();
export const OrderApprovedEventSchema = DomainEventEnvelopeSchema(
  'order.approved',
  OrderApprovedPayloadSchema,
);
export type OrderApprovedEvent = z.infer<typeof OrderApprovedEventSchema>;

export const OrderCancelledPayloadSchema = z
  .object({
    orderId: OrderIdSchema,
    reason: z.string().max(2000).nullable().optional(),
    cancelledBy: EmployeeIdSchema.nullable().optional(),
  })
  .strict();
export const OrderCancelledEventSchema = DomainEventEnvelopeSchema(
  'order.cancelled',
  OrderCancelledPayloadSchema,
);
export type OrderCancelledEvent = z.infer<typeof OrderCancelledEventSchema>;
