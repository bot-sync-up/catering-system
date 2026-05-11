import { z } from 'zod';
import {
  InvoiceIdSchema,
  CustomerIdSchema,
  OrderIdSchema,
} from '../common/id.js';
import { InvoiceSchema, InvoiceLineItemSchema } from '../entities/Invoice.js';
import { DocTypeSchema, DocTagSchema } from '../enums/DocType.js';

export const IssueInvoiceInputSchema = z
  .object({
    customerId: CustomerIdSchema,
    orderId: OrderIdSchema.nullable().optional(),
    docType: DocTypeSchema,
    docTag: DocTagSchema,
    items: z.array(InvoiceLineItemSchema.omit({ id: true })).min(1),
    notes: z.string().max(5000).nullable().optional(),
  })
  .strict();
export type IssueInvoiceInput = z.infer<typeof IssueInvoiceInputSchema>;
export const IssueInvoiceOutputSchema = InvoiceSchema;
export type IssueInvoiceOutput = z.infer<typeof IssueInvoiceOutputSchema>;

export const VoidInvoiceInputSchema = z
  .object({
    invoiceId: InvoiceIdSchema,
    reason: z.string().max(2000),
  })
  .strict();
export type VoidInvoiceInput = z.infer<typeof VoidInvoiceInputSchema>;
