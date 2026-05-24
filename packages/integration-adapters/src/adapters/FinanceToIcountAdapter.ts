/**
 * FinanceToIcountAdapter - מאזין ל-`invoice.issued`, יוצר חשבונית ב-iCount
 * ומקצה אותה למסמך החשבונאי המתאים (allocation).
 */

import { BaseAdapter, type BaseAdapterOptions, type AdapterContext } from '../BaseAdapter.js';

export interface IcountClient {
  createInvoice: (input: {
    invoiceId: string;
    customerId: string;
    items: Array<{ description: string; quantity: number; unitPrice: number; vatRate: number }>;
    totalAmount: number;
  }) => Promise<{ icountDocId: string; docNumber: string }>;
  allocate: (input: {
    icountDocId: string;
    glAccount: string;
  }) => Promise<{ allocationId: string }>;
}

export interface FinanceToIcountOptions extends BaseAdapterOptions {
  icount: IcountClient;
  glAccount?: string;
}

export class FinanceToIcountAdapter extends BaseAdapter<'invoice.issued'> {
  readonly name = 'finance-to-icount';
  readonly sourceEvent = 'invoice.issued' as const;

  constructor(private readonly opts: FinanceToIcountOptions) {
    super(opts);
  }

  protected async handle(ctx: AdapterContext<'invoice.issued'>): Promise<void> {
    const { event } = ctx;
    const doc = await this.opts.icount.createInvoice({
      invoiceId: event.payload.invoiceId,
      customerId: event.payload.customerId,
      items: event.payload.items,
      totalAmount: event.payload.totalAmount,
    });

    const allocation = await this.opts.icount.allocate({
      icountDocId: doc.icountDocId,
      glAccount: this.opts.glAccount ?? 'INCOME-100',
    });

    this.logger.info(
      {
        invoiceId: event.payload.invoiceId,
        icountDocId: doc.icountDocId,
        allocationId: allocation.allocationId,
      },
      'חשבונית הועתקה ל-iCount והוקצתה',
    );
  }
}
