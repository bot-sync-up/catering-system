import { z } from 'zod';

export const customerInputSchema = z.object({
  fullName: z.string().min(2, 'שם חייב להיות לפחות 2 תווים'),
  phone: z.string().min(7, 'מספר טלפון לא תקין'),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
});

export const orderItemInputSchema = z.object({
  productSku: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  kitchenInstructions: z.string().optional(),
});

export const orderTypeSchema = z.enum([
  'ONE_TIME_EVENT',
  'RECURRING_PLAN',
  'MONTHLY_SUBSCRIPTION',
]);

export const channelSchema = z.enum(['PORTAL', 'PHONE', 'WHATSAPP', 'AGENT']);

export const createOrderSchema = z.object({
  customer: customerInputSchema,
  type: orderTypeSchema,
  channel: channelSchema,
  eventDate: z.coerce.date().optional(),
  eventLocation: z.string().optional(),
  guestCount: z.number().int().positive().optional(),
  customerNotes: z.string().optional(),
  items: z.array(orderItemInputSchema).min(1, 'הזמנה חייבת לכלול פריט אחד לפחות'),
  takenBy: z.string().optional(),
});

export const cancelOrderSchema = z.object({
  orderId: z.string(),
  reason: z.string().min(1),
  swapToOrderId: z.string().optional(),
});

export const transitionSchema = z.object({
  orderId: z.string(),
  event: z.discriminatedUnion('type', [
    z.object({ type: z.literal('SUBMIT'), actor: z.string().optional() }),
    z.object({ type: z.literal('APPROVE'), actor: z.string() }),
    z.object({
      type: z.literal('REJECT'),
      actor: z.string(),
      reason: z.string(),
    }),
    z.object({ type: z.literal('WAITLIST'), actor: z.string().optional() }),
    z.object({
      type: z.literal('PROMOTE_FROM_WAITLIST'),
      actor: z.string().optional(),
    }),
    z.object({
      type: z.literal('START_PREPARING'),
      actor: z.string().optional(),
    }),
    z.object({
      type: z.literal('START_DELIVERY'),
      actor: z.string().optional(),
    }),
    z.object({ type: z.literal('COMPLETE'), actor: z.string().optional() }),
    z.object({
      type: z.literal('CANCEL'),
      actor: z.string().optional(),
      reason: z.string().optional(),
    }),
  ]),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type TransitionInput = z.infer<typeof transitionSchema>;
