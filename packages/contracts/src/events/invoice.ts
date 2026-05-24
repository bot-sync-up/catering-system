import { z } from 'zod';
import { DomainEventEnvelopeSchema } from './base.js';
import { InvoiceIdSchema, CustomerIdSchema } from '../common/id.js';
import { MoneySchema } from '../common/money.js';
import { DocTypeSchema, DocTagSchema } from '../enums/DocType.js';
import { IsoDateTimeSchema } from '../common/timestamps.js';

export const InvoiceIssuedPayloadSchema = z
  .object({
    invoiceId: InvoiceIdSchema,
    customerId: CustomerIdSchema,
    docType: DocTypeSchema,
    docTag: DocTagSchema,
    docNumber: z.string().min(1),
    grandTotal: MoneySchema,
    issuedAt: IsoDateTimeSchema,
  })
  .strict();
export const InvoiceIssuedEventSchema = DomainEventEnvelopeSchema(
  'invoice.issued',
  InvoiceIssuedPayloadSchema,
);
export type InvoiceIssuedEvent = z.infer<typeof InvoiceIssuedEventSchema>;

export const InvoicePaidPayloadSchema = z
  .object({
    invoiceId: InvoiceIdSchema,
    customerId: CustomerIdSchema,
    amountPaid: MoneySchema,
    paidAt: IsoDateTimeSchema,
  })
  .strict();
export const InvoicePaidEventSchema = DomainEventEnvelopeSchema(
  'invoice.paid',
  InvoicePaidPayloadSchema,
);
export type InvoicePaidEvent = z.infer<typeof InvoicePaidEventSchema>;
