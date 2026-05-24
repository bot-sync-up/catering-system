import { z } from 'zod';
import {
  CustomerIdSchema,
  InvoiceIdSchema,
  OrderIdSchema,
  LineItemIdSchema,
  ProductIdSchema,
} from '../common/id.js';
import { MoneySchema } from '../common/money.js';
import { TimestampsSchema, IsoDateTimeSchema } from '../common/timestamps.js';
import { DocTypeSchema, DocTagSchema } from '../enums/DocType.js';

/** שיעור מע"מ ברירת מחדל בישראל */
export const DEFAULT_VAT_RATE = 0.18;

export const InvoiceLineItemSchema = z
  .object({
    id: LineItemIdSchema,
    productId: ProductIdSchema.nullable().optional(),
    description: z.string().min(1).max(500),
    quantity: z
      .string()
      .regex(/^\d+(\.\d{1,4})?$/, 'Quantity must be a positive decimal'),
    unitPrice: MoneySchema,
    discountPct: z.number().min(0).max(100).default(0),
    taxRate: z.number().min(0).max(1).default(DEFAULT_VAT_RATE),
    lineTotal: MoneySchema,
  })
  .strict();
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;

export const InvoiceStatusSchema = z.enum([
  'DRAFT',
  'ISSUED',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'VOIDED',
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const InvoiceSchema = z
  .object({
    id: InvoiceIdSchema,
    docType: DocTypeSchema,
    /** רשמי / לא-רשמי — הפרדה חשובה לדיווח */
    docTag: DocTagSchema,

    /** מספר מסמך רשמי — נדרש רק כשהמסמך הוצא בפועל */
    docNumber: z.string().max(40).nullable().optional(),

    customerId: CustomerIdSchema,
    orderId: OrderIdSchema.nullable().optional(),

    issueDate: IsoDateTimeSchema,
    dueDate: IsoDateTimeSchema.nullable().optional(),

    status: InvoiceStatusSchema.default('DRAFT'),

    items: z.array(InvoiceLineItemSchema).min(1),

    subtotal: MoneySchema,
    /** סך מע"מ — נכון לישראל ברירת המחדל 18% */
    vatAmount: MoneySchema,
    vatRate: z.number().min(0).max(1).default(DEFAULT_VAT_RATE),
    discountTotal: MoneySchema,
    grandTotal: MoneySchema,
    amountPaid: MoneySchema,
    amountDue: MoneySchema,

    /** עבור CREDIT_NOTE — הפנייה לחשבונית המקור */
    relatedInvoiceId: InvoiceIdSchema.nullable().optional(),

    /** קישור ל-PDF במאגר קבצים */
    pdfUrl: z.string().url().nullable().optional(),

    notes: z.string().max(5000).nullable().optional(),
    internalNotes: z.string().max(5000).nullable().optional(),
  })
  .merge(TimestampsSchema)
  .strict()
  .superRefine((inv, ctx) => {
    if (inv.docType === 'CREDIT_NOTE' && !inv.relatedInvoiceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CREDIT_NOTE must reference a related invoice',
        path: ['relatedInvoiceId'],
      });
    }
    if (inv.status !== 'DRAFT' && !inv.docNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Issued/sent invoices must have a docNumber',
        path: ['docNumber'],
      });
    }
  });

export type Invoice = z.infer<typeof InvoiceSchema>;
