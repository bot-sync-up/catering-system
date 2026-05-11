/**
 * crm-to-finance.adapter.ts
 *
 * תפקיד:
 *   כאשר ליד הופך להזמנה (`quote.accepted`), פותח לקוח/חשבון בכרטיס לקוח
 *   במערכת ה-Finance ומפרסם אירוע פנימי שמתאים.
 *
 * Stub:
 *   `FinanceClient` הוא interface — המימוש האמיתי יתחבר ל-ERP/Finance הקיים.
 */
import { BaseAdapter, type BaseAdapterOptions } from './BaseAdapter.js';

export interface FinanceClient {
  /** יוצר לקוח ב-Finance אם לא קיים, מחזיר customerId */
  ensureCustomer(input: { leadId: string; name?: string; amount?: number }): Promise<string>;
}

export interface CrmToFinanceAdapterOptions extends BaseAdapterOptions {
  finance: FinanceClient;
}

export class CrmToFinanceAdapter extends BaseAdapter {
  readonly name = 'crm-to-finance';
  private readonly finance: FinanceClient;

  constructor(opts: CrmToFinanceAdapterOptions) {
    super(opts);
    this.finance = opts.finance;
  }

  protected register(): void {
    this.on('quote.accepted', 'ensure-customer', async (evt) => {
      const customerId = await this.finance.ensureCustomer({
        leadId: evt.payload.leadId,
      });
      this.logger.debug({ customerId }, 'finance customer ensured');
    });
  }
}
