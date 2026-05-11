/**
 * inventory-to-purchasing.adapter.ts
 *
 * תפקיד: על `inventory.low` יוצר Purchase Order במערכת הרכש.
 * Stub: PurchasingClient — יחובר ל-Purchasing Service.
 */
import { BaseAdapter, type BaseAdapterOptions } from './BaseAdapter.js';

export interface PurchasingClient {
  createPurchaseOrder(input: { sku: string; quantity: number; warehouse?: string }): Promise<string>;
}

export interface InventoryToPurchasingAdapterOptions extends BaseAdapterOptions {
  purchasing: PurchasingClient;
  /** היחס בין שורת inventory לבין כמות לרכישה (ברירת מחדל: x3 מהמינימום) */
  reorderMultiplier?: number;
}

export class InventoryToPurchasingAdapter extends BaseAdapter {
  readonly name = 'inventory-to-purchasing';
  private readonly purchasing: PurchasingClient;
  private readonly reorderMultiplier: number;

  constructor(opts: InventoryToPurchasingAdapterOptions) {
    super(opts);
    this.purchasing = opts.purchasing;
    this.reorderMultiplier = opts.reorderMultiplier ?? 3;
  }

  protected register(): void {
    this.on('inventory.low', 'create-purchase-order', async (evt) => {
      const quantity = Math.max(1, evt.payload.minQty * this.reorderMultiplier);
      const poId = await this.purchasing.createPurchaseOrder({
        sku: evt.payload.sku,
        quantity,
        warehouse: evt.payload.warehouse,
      });
      this.logger.info({ poId, sku: evt.payload.sku, quantity }, 'purchase order created');
    });
  }
}
