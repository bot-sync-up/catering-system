import { z } from 'zod';

export const NewEventOrderInput = z.object({
  customer: z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    phone: z.string().min(7),
    email: z.string().email().optional(),
    vatId: z.string().optional(),
  }),
  event: z.object({
    date: z.string(),
    guests: z.number().int().positive(),
    venue: z.string().min(1),
    address: z.string().min(1),
    arriveBy: z.string(),
    type: z.enum(['wedding', 'bar-mitzvah', 'corporate', 'private']).default('wedding'),
  }),
  quote: z.object({
    amount: z.number().positive(),
    currency: z.enum(['ILS', 'USD']).default('ILS'),
  }),
  menu: z
    .array(
      z.object({
        dish: z.string(),
        qty: z.number().int().positive(),
        station: z.enum(['cold', 'hot', 'pastry', 'bar']),
      }),
    )
    .min(1),
  ingredients: z
    .array(z.object({ sku: z.string(), qty: z.number().positive() }))
    .min(1),
  staffPlan: z
    .array(
      z.object({
        role: z.enum(['waiter', 'chef', 'sous', 'bartender', 'manager']),
        count: z.number().int().positive(),
      }),
    )
    .min(1),
});
export type NewEventOrderInput = z.infer<typeof NewEventOrderInput>;

export const ApproveAndBillInput = z.object({
  orderId: z.string(),
  customerId: z.string(),
  invoiceAmount: z.number().positive(),
  vatRate: z.number().min(0).max(1).default(0.17),
  paymentToken: z.string(),
  currency: z.enum(['ILS', 'USD']).default('ILS'),
  notifyEmail: z.string().email().optional(),
});
export type ApproveAndBillInput = z.infer<typeof ApproveAndBillInput>;

export const CancelEventInput = z.object({
  runId: z.string().optional(),
  orderId: z.string(),
  eventId: z.string(),
  reason: z.string().min(1),
  refund: z
    .object({
      chargeId: z.string(),
      amount: z.number().positive(),
    })
    .optional(),
  invoiceId: z.string().optional(),
  reservationId: z.string().optional(),
  purchaseOrderIds: z.array(z.string()).default([]),
  deliveryId: z.string().optional(),
  notifyEmail: z.string().email().optional(),
});
export type CancelEventInput = z.infer<typeof CancelEventInput>;
