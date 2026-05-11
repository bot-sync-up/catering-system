/**
 * finance-to-icount.adapter.ts
 *
 * תפקיד: על `invoice.issued` יוצר חשבונית ב-iCount.
 * iCount = interface בלבד (mock לא אמת) — המימוש האמיתי יחובר ב-bootstrap.
 */
import { BaseAdapter, type BaseAdapterOptions } from './BaseAdapter.js';

/**
 * iCountClient — חוזה לאינטגרציה עם iCount.
 * Endpoints מתועדים ב-https://www.icount.co.il/api-docs/
 */
export interface ICountClient {
  /** יוצר מסמך חשבונית-מס באייקאונט, מחזיר doc_id ו-link */
  createTaxInvoice(input: {
    orderId: string;
    customerName: string;
    amount: number;
    currency: string;
    items: Array<{ description: string; quantity: number; unitPrice: number }>;
  }): Promise<{ docId: string; downloadUrl?: string }>;
}

/** Mock פשוט לבדיקות — מחזיר docId דטרמיניסטי */
export class MockICountClient implements ICountClient {
  readonly calls: Array<Parameters<ICountClient['createTaxInvoice']>[0]> = [];
  async createTaxInvoice(input: Parameters<ICountClient['createTaxInvoice']>[0]) {
    this.calls.push(input);
    return { docId: `icount-${input.orderId}`, downloadUrl: `https://mock.icount/${input.orderId}` };
  }
}

export interface FinanceToICountAdapterOptions extends BaseAdapterOptions {
  icount: ICountClient;
  getInvoiceMeta(invoiceId: string, orderId: string): Promise<{
    customerName: string;
    items: Array<{ description: string; quantity: number; unitPrice: number }>;
  }>;
}

export class FinanceToICountAdapter extends BaseAdapter {
  readonly name = 'finance-to-icount';
  private readonly icount: ICountClient;
  private readonly getInvoiceMeta: FinanceToICountAdapterOptions['getInvoiceMeta'];

  constructor(opts: FinanceToICountAdapterOptions) {
    super(opts);
    this.icount = opts.icount;
    this.getInvoiceMeta = opts.getInvoiceMeta;
  }

  protected register(): void {
    this.on('invoice.issued', 'icount-create-tax-invoice', async (evt) => {
      const meta = await this.getInvoiceMeta(evt.payload.invoiceId, evt.payload.orderId);
      const res = await this.icount.createTaxInvoice({
        orderId: evt.payload.orderId,
        customerName: meta.customerName,
        amount: evt.payload.amount,
        currency: evt.payload.currency,
        items: meta.items,
      });
      this.logger.info({ docId: res.docId }, 'icount invoice created');
    });
  }
}
