/**
 * orders-to-kitchen.adapter.ts
 *
 * תפקיד: על `order.approved` יוצר משימת הכנה במערכת המטבח.
 * Stub: KitchenClient — יחובר ל-Kitchen Service.
 */
import { BaseAdapter, type BaseAdapterOptions } from './BaseAdapter.js';

export interface KitchenClient {
  createPrepTask(input: { orderId: string; items: Array<{ sku: string; quantity: number }>; dueAt?: string }): Promise<string>;
}

export interface OrdersToKitchenAdapterOptions extends BaseAdapterOptions {
  kitchen: KitchenClient;
  getOrderItems(orderId: string): Promise<{ items: Array<{ sku: string; quantity: number }>; dueAt?: string }>;
}

export class OrdersToKitchenAdapter extends BaseAdapter {
  readonly name = 'orders-to-kitchen';
  private readonly kitchen: KitchenClient;
  private readonly getOrderItems: OrdersToKitchenAdapterOptions['getOrderItems'];

  constructor(opts: OrdersToKitchenAdapterOptions) {
    super(opts);
    this.kitchen = opts.kitchen;
    this.getOrderItems = opts.getOrderItems;
  }

  protected register(): void {
    this.on('order.approved', 'create-kitchen-task', async (evt) => {
      const { items, dueAt } = await this.getOrderItems(evt.payload.orderId);
      const taskId = await this.kitchen.createPrepTask({ orderId: evt.payload.orderId, items, dueAt });
      this.logger.info({ taskId }, 'kitchen task created');
    });
  }
}
