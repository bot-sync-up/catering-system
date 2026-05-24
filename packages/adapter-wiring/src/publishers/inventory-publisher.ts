/**
 * InventoryPublisher - אירועי מלאי.
 *
 * אירועים:
 *  - inventory.low      - מלאי ירד מתחת לסף (trigger ל-PO אוטומטי)
 *  - inventory.received - סחורה התקבלה למחסן (מ-PO / החזרה)
 */

import pino, { type Logger } from 'pino';
import type { EventBus } from '@catering/event-bus';
import type { PublisherBaseOptions, PublishContext } from './types.js';

export interface InventoryPublisherOptions extends PublisherBaseOptions {}

export interface InventoryLowInput {
  sku: string;
  productName: string;
  currentQuantity: number;
  thresholdQuantity: number;
  reorderQuantity: number;
  warehouseId: string;
}

export interface InventoryReceivedInput {
  receivedId: string;
  poNumber?: string;
  sku: string;
  quantity: number;
  warehouseId: string;
  receivedAt?: string;
}

export class InventoryPublisher {
  private readonly bus: EventBus;
  private readonly logger: Logger;

  constructor(opts: InventoryPublisherOptions) {
    this.bus = opts.bus;
    this.logger = opts.logger ?? pino({ name: 'publisher:inventory' });
  }

  async publishInventoryLow(
    input: InventoryLowInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.warn(
      { sku: input.sku, current: input.currentQuantity },
      'מפרסם inventory.low',
    );
    return this.bus.publish('inventory.low', input, ctx);
  }

  async publishInventoryReceived(
    input: InventoryReceivedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.info(
      { sku: input.sku, quantity: input.quantity },
      'מפרסם inventory.received',
    );
    return this.bus.publish(
      'inventory.received',
      {
        receivedId: input.receivedId,
        poNumber: input.poNumber,
        sku: input.sku,
        quantity: input.quantity,
        warehouseId: input.warehouseId,
        receivedAt: input.receivedAt ?? new Date().toISOString(),
      },
      ctx,
    );
  }
}
