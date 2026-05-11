/**
 * portal-to-orders.adapter.ts
 *
 * תפקיד: מאזין ל-`quote.accepted` ויוצר הזמנה ב-Orders Service.
 * Stub: OrdersClient — יחובר ל-service האמיתי בהמשך.
 */
import { BaseAdapter, type BaseAdapterOptions } from './BaseAdapter.js';

export interface OrdersClient {
  createFromQuote(input: { quoteId: string; leadId: string }): Promise<string>;
}

export interface PortalToOrdersAdapterOptions extends BaseAdapterOptions {
  orders: OrdersClient;
}

export class PortalToOrdersAdapter extends BaseAdapter {
  readonly name = 'portal-to-orders';
  private readonly orders: OrdersClient;

  constructor(opts: PortalToOrdersAdapterOptions) {
    super(opts);
    this.orders = opts.orders;
  }

  protected register(): void {
    this.on('quote.accepted', 'create-order', async (evt) => {
      const orderId = await this.orders.createFromQuote({
        quoteId: evt.payload.quoteId,
        leadId: evt.payload.leadId,
      });
      this.logger.info({ orderId }, 'order created from accepted quote');
    });
  }
}
