/**
 * orders-to-logistics.adapter.ts
 *
 * תפקיד: על `order.approved` יוצר משימת משלוח/שיבוץ נהג ב-Logistics.
 * Stub: LogisticsClient — יחובר ל-Logistics Service.
 */
import { BaseAdapter, type BaseAdapterOptions } from './BaseAdapter.js';

export interface LogisticsClient {
  createDelivery(input: { orderId: string; address?: string; scheduledAt?: string }): Promise<string>;
}

export interface OrdersToLogisticsAdapterOptions extends BaseAdapterOptions {
  logistics: LogisticsClient;
  getDeliveryDetails(orderId: string): Promise<{ address?: string; scheduledAt?: string }>;
}

export class OrdersToLogisticsAdapter extends BaseAdapter {
  readonly name = 'orders-to-logistics';
  private readonly logistics: LogisticsClient;
  private readonly getDeliveryDetails: OrdersToLogisticsAdapterOptions['getDeliveryDetails'];

  constructor(opts: OrdersToLogisticsAdapterOptions) {
    super(opts);
    this.logistics = opts.logistics;
    this.getDeliveryDetails = opts.getDeliveryDetails;
  }

  protected register(): void {
    this.on('order.approved', 'create-delivery', async (evt) => {
      const details = await this.getDeliveryDetails(evt.payload.orderId);
      const deliveryId = await this.logistics.createDelivery({ orderId: evt.payload.orderId, ...details });
      this.logger.info({ deliveryId }, 'delivery created');
    });
  }
}
