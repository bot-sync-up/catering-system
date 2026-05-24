import { z } from 'zod';
import { DomainEventEnvelopeSchema } from './base.js';
import { ProductIdSchema, SupplierIdSchema } from '../common/id.js';
import { IsoDateTimeSchema } from '../common/timestamps.js';

export const InventoryLowPayloadSchema = z
  .object({
    productId: ProductIdSchema,
    currentQty: z.string(),
    minQty: z.string(),
  })
  .strict();
export const InventoryLowEventSchema = DomainEventEnvelopeSchema(
  'inventory.low',
  InventoryLowPayloadSchema,
);
export type InventoryLowEvent = z.infer<typeof InventoryLowEventSchema>;

export const InventoryReceivedPayloadSchema = z
  .object({
    productId: ProductIdSchema,
    supplierId: SupplierIdSchema.nullable().optional(),
    quantity: z.string(),
    receivedAt: IsoDateTimeSchema,
  })
  .strict();
export const InventoryReceivedEventSchema = DomainEventEnvelopeSchema(
  'inventory.received',
  InventoryReceivedPayloadSchema,
);
export type InventoryReceivedEvent = z.infer<
  typeof InventoryReceivedEventSchema
>;
