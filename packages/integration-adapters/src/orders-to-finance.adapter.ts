/**
 * orders-to-finance.adapter.ts
 *
 * תפקיד: על `order.approved` יוצר חשבונית עסקה ב-Finance, מפרסם `invoice.issued`.
 * Stub: FinanceClient — יחובר ל-Finance Service בהמשך.
 */
import { BaseAdapter, type BaseAdapterOptions } from './BaseAdapter.js';

export interface FinanceInvoiceClient {
  createInvoice(input: { orderId: string; amount: number; currency: string }): Promise<{ invoiceId: string; externalRef?: string }>;
}

export interface OrdersToFinanceAdapterOptions extends BaseAdapterOptions {
  finance: FinanceInvoiceClient;
  /** מחזיר את total ההזמנה — מקור אמת */
  getOrderAmount(orderId: string): Promise<{ amount: number; currency: string }>;
}

export class OrdersToFinanceAdapter extends BaseAdapter {
  readonly name = 'orders-to-finance';
  private readonly finance: FinanceInvoiceClient;
  private readonly getOrderAmount: OrdersToFinanceAdapterOptions['getOrderAmount'];

  constructor(opts: OrdersToFinanceAdapterOptions) {
    super(opts);
    this.finance = opts.finance;
    this.getOrderAmount = opts.getOrderAmount;
  }

  protected register(): void {
    this.on('order.approved', 'create-invoice', async (evt) => {
      const { amount, currency } = await this.getOrderAmount(evt.payload.orderId);
      const inv = await this.finance.createInvoice({ orderId: evt.payload.orderId, amount, currency });
      await this.bus.publish('invoice.issued', {
        invoiceId: inv.invoiceId,
        orderId: evt.payload.orderId,
        amount,
        currency,
        externalRef: inv.externalRef,
      });
    });
  }
}
