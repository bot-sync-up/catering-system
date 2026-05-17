/**
 * OrdersToKitchenAdapter - מאזין ל-`order.approved` ויוצר משימות מטבח (PrepTasks).
 */

import { BaseAdapter, type BaseAdapterOptions, type AdapterContext } from '../BaseAdapter.js';

export interface KitchenClient {
  createPrepTasks: (input: {
    orderId: string;
    items: Array<{ sku: string; name: string; quantity: number }>;
  }) => Promise<{ taskIds: string[] }>;
}

export interface OrdersLookup {
  getOrderItems: (orderId: string) => Promise<
    Array<{ sku: string; name: string; quantity: number }>
  >;
}

export interface OrdersToKitchenOptions extends BaseAdapterOptions {
  kitchen: KitchenClient;
  orders: OrdersLookup;
}

export class OrdersToKitchenAdapter extends BaseAdapter<'order.approved'> {
  readonly name = 'orders-to-kitchen';
  readonly sourceEvent = 'order.approved' as const;

  constructor(private readonly opts: OrdersToKitchenOptions) {
    super(opts);
  }

  protected async handle(ctx: AdapterContext<'order.approved'>): Promise<void> {
    const items = await this.opts.orders.getOrderItems(ctx.event.payload.orderId);
    const result = await this.opts.kitchen.createPrepTasks({
      orderId: ctx.event.payload.orderId,
      items,
    });
    this.logger.info(
      {
        orderId: ctx.event.payload.orderId,
        tasksCreated: result.taskIds.length,
      },
      'נוצרו משימות מטבח',
    );
  }
}
