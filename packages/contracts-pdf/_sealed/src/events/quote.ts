import { z } from 'zod';
import { DomainEventEnvelopeSchema } from './base.js';
import { QuoteIdSchema, CustomerIdSchema, OrderIdSchema } from '../common/id.js';
import { MoneySchema } from '../common/money.js';
import { IsoDateTimeSchema } from '../common/timestamps.js';

export const QuoteSentPayloadSchema = z
  .object({
    quoteId: QuoteIdSchema,
    customerId: CustomerIdSchema,
    grandTotal: MoneySchema,
    sentAt: IsoDateTimeSchema,
    channel: z.enum(['EMAIL', 'WHATSAPP', 'SMS', 'OTHER']),
  })
  .strict();
export const QuoteSentEventSchema = DomainEventEnvelopeSchema(
  'quote.sent',
  QuoteSentPayloadSchema,
);
export type QuoteSentEvent = z.infer<typeof QuoteSentEventSchema>;

export const QuoteAcceptedPayloadSchema = z
  .object({
    quoteId: QuoteIdSchema,
    customerId: CustomerIdSchema,
    acceptedAt: IsoDateTimeSchema,
    /** ההזמנה שנוצרה כתוצאה מהאישור */
    resultingOrderId: OrderIdSchema.nullable().optional(),
  })
  .strict();
export const QuoteAcceptedEventSchema = DomainEventEnvelopeSchema(
  'quote.accepted',
  QuoteAcceptedPayloadSchema,
);
export type QuoteAcceptedEvent = z.infer<typeof QuoteAcceptedEventSchema>;
