/**
 * OrdersToFinanceAdapter - מאזין ל-`order.approved` ומוציא Invoice.
 */

import { BaseAdapter, type BaseAdapterOptions, type AdapterContext } from '../BaseAdapter.js';

export interface InvoiceClient {
  issueInvoice: (input: {
    orderId: string;
    customerId: string;
    items: Array<{ description: string; quantity: number; unitPrice: number }>;
  }) => Promise<{ invoiceId: string; totalAmount: number; dueDate: string }>;
}

export interface OrdersLookup {
  getOrder: (orderId: string) => Promise<{
    customerId: string;
    items: Array<{ description: string; quantity: number; unitPrice: number }>;
  }>;
}

export interface OrdersToFinanceOptions extends BaseAdapterOptions {
  invoice: InvoiceClient;
  orders: OrdersLookup;
}

export class OrdersToFinanceAdapter extends BaseAdapter<'order.approved'> {
  readonly name = 'orders-to-finance';
  readonly sourceEvent = 'order.approved' as const;

  constructor(private readonly opts: OrdersToFinanceOptions) {
    super(opts);
  }

  protected async handle(ctx: AdapterContext<'order.approved'>): Promise<void> {
    const { event } = ctx;
    const order = await this.opts.orders.getOrder(event.payload.orderId);
    const invoice = await this.opts.invoice.issueInvoice({
      orderId: event.payload.orderId,
      customerId: order.customerId,
      items: order.items,
    });

    await this.bus.publish(
      'invoice.issued',
      {
        invoiceId: invoice.invoiceId,
        orderId: event.payload.orderId,
        customerId: order.customerId,
        totalAmount: invoice.totalAmount,
        currency: 'ILS',
        issuedAt: new Date().toISOString(),
        dueDate: invoice.dueDate,
        items: order.items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.quantity * it.unitPrice,
          vatRate: 0.17,
        })),
      },
      {
        correlationId: event.metadata.correlationId,
        causationId: event.metadata.id,
      },
    );
  }
}
