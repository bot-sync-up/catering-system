import { z } from 'zod';

/** מצב הזמנה (state machine) */
export const OrderStatusSchema = z.enum([
  'DRAFT',
  'QUOTED',
  'PENDING_APPROVAL',
  'APPROVED',
  'IN_PREPARATION',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
]);
export const OrderStatus = OrderStatusSchema.enum;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

/** מעברים חוקיים במכונת המצבים — לשימוש שירותי domain */
export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  DRAFT: ['QUOTED', 'CANCELLED'],
  QUOTED: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'CANCELLED'],
  APPROVED: ['IN_PREPARATION', 'CANCELLED'],
  IN_PREPARATION: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['COMPLETED', 'REFUNDED'],
  COMPLETED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
} as const;
