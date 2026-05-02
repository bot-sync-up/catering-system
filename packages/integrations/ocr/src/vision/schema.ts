import { z } from 'zod';

/**
 * Canonical invoice schema returned by Claude Vision.
 * All numeric fields are in the invoice's stated currency.
 */
export const InvoiceItemSchema = z.object({
  desc: z.string().min(1),
  qty: z.number().nonnegative(),
  price: z.number().nonnegative(), // unit price, ex-VAT
  vat: z.number().min(0).max(1).default(0.17), // VAT rate as fraction (0.17 = 17%)
  sku: z.string().optional(),
  lineTotal: z.number().nonnegative().optional(),
});

export const InvoiceSchema = z.object({
  supplier: z.object({
    name: z.string().min(1),
    taxId: z.string().regex(/^\d{8,9}$/).describe('Israeli ח.פ / ע.מ - 8 or 9 digits'),
    address: z.string().optional(),
    phone: z.string().optional(),
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('ISO date'),
  invoiceNum: z.string().min(1),
  currency: z.string().default('ILS'),
  items: z.array(InvoiceItemSchema).min(1),
  subtotal: z.number().nonnegative().optional(),
  vatTotal: z.number().nonnegative().optional(),
  total: z.number().nonnegative(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  poRef: z.string().optional().describe('Reference to a purchase order, if printed'),
  notes: z.string().optional(),
});

export type Invoice = z.infer<typeof InvoiceSchema>;
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

/**
 * Partial extraction (for low-confidence scans). Verification UI lets
 * a human upgrade Partial -> full Invoice.
 */
export const PartialInvoiceSchema = InvoiceSchema.deepPartial();
export type PartialInvoice = z.infer<typeof PartialInvoiceSchema>;
