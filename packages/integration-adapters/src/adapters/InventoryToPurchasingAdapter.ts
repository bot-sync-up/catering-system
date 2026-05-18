/**
 * InventoryToPurchasingAdapter - מאזין ל-`inventory.low` ויוצר Purchase Order.
 */

import { BaseAdapter, type BaseAdapterOptions, type AdapterContext } from '../BaseAdapter.js';

export interface PurchasingClient {
  createPurchaseOrder: (input: {
    sku: string;
    quantity: number;
    warehouseId: string;
  }) => Promise<{ poNumber: string; vendorId: string; expectedDelivery: string }>;
}

export interface InventoryToPurchasingOptions extends BaseAdapterOptions {
  purchasing: PurchasingClient;
}

export class InventoryToPurchasingAdapter extends BaseAdapter<'inventory.low'> {
  readonly name = 'inventory-to-purchasing';
  readonly sourceEvent = 'inventory.low' as const;

  constructor(private readonly opts: InventoryToPurchasingOptions) {
    super(opts);
  }

  protected async handle(ctx: AdapterContext<'inventory.low'>): Promise<void> {
    const { event } = ctx;
    const po = await this.opts.purchasing.createPurchaseOrder({
      sku: event.payload.sku,
      quantity: event.payload.reorderQuantity,
      warehouseId: event.payload.warehouseId,
    });
    this.logger.info(
      {
        sku: event.payload.sku,
        poNumber: po.poNumber,
        vendorId: po.vendorId,
      },
      'PO נוצר עבור מלאי נמוך',
    );
  }
}
