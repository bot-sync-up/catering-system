import { z } from 'zod';
import {
  CustomerIdSchema,
  EventIdSchema,
  OrderIdSchema,
  ProductIdSchema,
  LineItemIdSchema,
} from '../common/id.js';
import { MoneySchema } from '../common/money.js';
import { TimestampsSchema, IsoDateTimeSchema } from '../common/timestamps.js';
import { AddressSchema } from '../common/address.js';
import { OrderStatusSchema } from '../enums/OrderStatus.js';

/** סוג הזמנה */
export const OrderTypeSchema = z.enum([
  'ONE_TIME_EVENT',
  'SUBSCRIPTION',
  'MONTHLY_PLAN',
]);
export const OrderType = OrderTypeSchema.enum;
export type OrderType = z.infer<typeof OrderTypeSchema>;

/** תדירות חיוב למינוי / תכנית חודשית */
export const BillingCadenceSchema = z.enum([
  'DAILY',
  'WEEKLY',
  'BIWEEKLY',
  'MONTHLY',
  'CUSTOM',
]);
export type BillingCadence = z.infer<typeof BillingCadenceSchema>;

export const OrderLineItemSchema = z
  .object({
    id: LineItemIdSchema,
    productId: ProductIdSchema.nullable().optional(),
    description: z.string().min(1).max(500),
    quantity: z
      .string()
      .regex(/^\d+(\.\d{1,4})?$/, 'Quantity must be a positive decimal'),
    unitPrice: MoneySchema,
    discountPct: z.number().min(0).max(100).default(0),
    taxRate: z.number().min(0).max(1).default(0.18),
    /** סך-כל לפני מע"מ — מחושב ע"י השירות, נכלל לאימות */
    lineTotal: MoneySchema,
  })
  .strict();
export type OrderLineItem = z.infer<typeof OrderLineItemSchema>;

const RecurrenceSchema = z
  .object({
    cadence: BillingCadenceSchema,
    /** עבור CUSTOM: ביטוי iCal RRULE */
    rrule: z.string().nullable().optional(),
    startDate: IsoDateTimeSchema,
    endDate: IsoDateTimeSchema.nullable().optional(),
  })
  .strict();

export const OrderSchema = z
  .object({
    id: OrderIdSchema,
    type: OrderTypeSchema,
    status: OrderStatusSchema.default('DRAFT'),

    customerId: CustomerIdSchema,
    eventId: EventIdSchema.nullable().optional(),

    /** מקור ההזמנה */
    channel: z
      .enum(['DIRECT', 'PHONE', 'WEB', 'WHATSAPP', 'EMAIL', 'OTHER'])
      .default('DIRECT'),

    items: z.array(OrderLineItemSchema).min(1),

    subtotal: MoneySchema,
    taxTotal: MoneySchema,
    discountTotal: MoneySchema,
    grandTotal: MoneySchema,

    /** לכמות סועדים — חשוב לאירועים */
    headcount: z.number().int().positive().nullable().optional(),

    deliveryAddress: AddressSchema.nullable().optional(),
    scheduledFor: IsoDateTimeSchema.nullable().optional(),

    /** תדירות — רק אם type=SUBSCRIPTION/MONTHLY_PLAN */
    recurrence: RecurrenceSchema.nullable().optional(),

    notes: z.string().max(5000).nullable().optional(),
    internalNotes: z.string().max(5000).nullable().optional(),
  })
  .merge(TimestampsSchema)
  .strict()
  .superRefine((o, ctx) => {
    if (
      (o.type === 'SUBSCRIPTION' || o.type === 'MONTHLY_PLAN') &&
      !o.recurrence
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Recurrence required for SUBSCRIPTION / MONTHLY_PLAN orders',
        path: ['recurrence'],
      });
    }
    if (o.type === 'ONE_TIME_EVENT' && o.recurrence) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Recurrence not allowed for ONE_TIME_EVENT orders',
        path: ['recurrence'],
      });
    }
  });

export type Order = z.infer<typeof OrderSchema>;
