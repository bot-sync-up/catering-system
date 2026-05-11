/**
 * cardcom-to-finance.adapter.ts
 *
 * תפקיד: webhook מ-Cardcom (תשלום הצליח/נכשל) → publish ל-bus
 * (`payment.received` / `payment.failed`) ועדכון Finance.
 *
 * ה-adapter לא רושם handler על ה-bus — הוא חושף method `handleWebhook`
 * שנקרא מ-HTTP router. אבל כן רושם handler על `payment.received`
 * כדי לעדכן את Finance במצב התשלום.
 */
import { BaseAdapter, type BaseAdapterOptions } from './BaseAdapter.js';

export interface CardcomWebhookPayload {
  /** מזהה ייחודי של webhook — לשימוש ב-idempotency */
  webhookId: string;
  dealId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'approved' | 'declined';
  errorCode?: string;
  errorReason?: string;
}

export interface FinanceStatusClient {
  markPaymentReceived(input: { orderId: string; paymentId: string; amount: number }): Promise<void>;
}

export interface CardcomToFinanceAdapterOptions extends BaseAdapterOptions {
  finance: FinanceStatusClient;
}

export class CardcomToFinanceAdapter extends BaseAdapter {
  readonly name = 'cardcom-to-finance';
  private readonly finance: FinanceStatusClient;

  constructor(opts: CardcomToFinanceAdapterOptions) {
    super(opts);
    this.finance = opts.finance;
  }

  /** נקרא מ-HTTP route בעת קבלת webhook מ-Cardcom */
  async handleWebhook(payload: CardcomWebhookPayload): Promise<void> {
    const log = this.logger.child({ webhookId: payload.webhookId, dealId: payload.dealId });
    const idemKey = `${payload.webhookId}:cardcom-webhook`;
    if (await this.idempotency.seen(idemKey)) {
      log.debug('webhook already processed');
      return;
    }
    if (payload.status === 'approved') {
      await this.bus.publish('payment.received', {
        paymentId: payload.dealId,
        orderId: payload.orderId,
        amount: payload.amount,
        currency: payload.currency,
        method: 'credit_card',
        externalRef: payload.dealId,
      });
    } else {
      await this.bus.publish('payment.failed', {
        paymentId: payload.dealId,
        orderId: payload.orderId,
        amount: payload.amount,
        reason: payload.errorReason ?? 'declined',
        errorCode: payload.errorCode,
      });
    }
    await this.idempotency.mark(idemKey);
    log.info({ status: payload.status }, 'cardcom webhook processed');
  }

  protected register(): void {
    this.on('payment.received', 'mark-finance-paid', async (evt) => {
      await this.finance.markPaymentReceived({
        orderId: evt.payload.orderId,
        paymentId: evt.payload.paymentId,
        amount: evt.payload.amount,
      });
    });
  }
}
