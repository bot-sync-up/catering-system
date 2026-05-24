/**
 * finance-to-cardcom.adapter.ts
 *
 * תפקיד: על `invoice.issued` יוצר בקשת חיוב/קישור תשלום ב-Cardcom.
 * Cardcom = interface + mock לא אמת. המימוש האמיתי יחובר ב-bootstrap.
 */
import { BaseAdapter, type BaseAdapterOptions } from './BaseAdapter.js';

/**
 * CardcomClient — חוזה לאינטגרציה עם Cardcom (סליקה).
 * docs: https://kb.cardcom.solutions/category/api-low-level
 */
export interface CardcomClient {
  /** יוצר LowProfileDeal — קישור-תשלום ללקוח */
  createPaymentLink(input: {
    orderId: string;
    amount: number;
    currency: string;
    successUrl?: string;
    failUrl?: string;
  }): Promise<{ paymentUrl: string; dealId: string }>;
}

export class MockCardcomClient implements CardcomClient {
  readonly calls: Array<Parameters<CardcomClient['createPaymentLink']>[0]> = [];
  async createPaymentLink(input: Parameters<CardcomClient['createPaymentLink']>[0]) {
    this.calls.push(input);
    return { paymentUrl: `https://mock.cardcom/pay/${input.orderId}`, dealId: `cc-${input.orderId}` };
  }
}

export interface FinanceToCardcomAdapterOptions extends BaseAdapterOptions {
  cardcom: CardcomClient;
  successUrl?: string;
  failUrl?: string;
}

export class FinanceToCardcomAdapter extends BaseAdapter {
  readonly name = 'finance-to-cardcom';
  private readonly cardcom: CardcomClient;
  private readonly successUrl?: string;
  private readonly failUrl?: string;

  constructor(opts: FinanceToCardcomAdapterOptions) {
    super(opts);
    this.cardcom = opts.cardcom;
    this.successUrl = opts.successUrl;
    this.failUrl = opts.failUrl;
  }

  protected register(): void {
    this.on('invoice.issued', 'cardcom-create-link', async (evt) => {
      const res = await this.cardcom.createPaymentLink({
        orderId: evt.payload.orderId,
        amount: evt.payload.amount,
        currency: evt.payload.currency,
        successUrl: this.successUrl,
        failUrl: this.failUrl,
      });
      this.logger.info({ dealId: res.dealId }, 'cardcom payment link created');
    });
  }
}
