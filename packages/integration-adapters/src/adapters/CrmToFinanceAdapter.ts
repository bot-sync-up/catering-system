/**
 * CrmToFinanceAdapter - מאזין ל-`lead.qualified` ויוצר Quote ב-finance.
 *
 * Flow:
 *  1. lead מאושר במערכת ה-CRM
 *  2. ה-adapter מקבל את האירוע
 *  3. שולח בקשה ל-finance service ליצירת Quote טיוטה
 *  4. מפרסם `quote.sent` כאשר ה-Quote נשלח ללקוח
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseAdapter, type BaseAdapterOptions, type AdapterContext } from '../BaseAdapter.js';

export interface FinanceQuoteClient {
  createQuote: (input: {
    leadId: string;
    customerName: string;
    estimatedValue: number;
  }) => Promise<{ quoteId: string; totalAmount: number; validUntil: string }>;
}

export interface CrmLookup {
  getLead: (leadId: string) => Promise<{
    customerName: string;
    customerId: string;
    estimatedValue: number;
  }>;
}

export interface CrmToFinanceOptions extends BaseAdapterOptions {
  finance: FinanceQuoteClient;
  crm: CrmLookup;
}

export class CrmToFinanceAdapter extends BaseAdapter<'lead.qualified'> {
  readonly name = 'crm-to-finance';
  readonly sourceEvent = 'lead.qualified' as const;

  constructor(private readonly opts: CrmToFinanceOptions) {
    super(opts);
  }

  protected async handle(ctx: AdapterContext<'lead.qualified'>): Promise<void> {
    const { event } = ctx;
    const lead = await this.opts.crm.getLead(event.payload.leadId);
    const quote = await this.opts.finance.createQuote({
      leadId: event.payload.leadId,
      customerName: lead.customerName,
      estimatedValue: lead.estimatedValue,
    });

    await this.bus.publish(
      'quote.sent',
      {
        quoteId: quote.quoteId,
        leadId: event.payload.leadId,
        customerId: lead.customerId,
        totalAmount: quote.totalAmount,
        currency: 'ILS',
        validUntil: quote.validUntil,
        items: [
          {
            sku: 'EVENT-PACKAGE',
            name: 'חבילת אירוע',
            quantity: 1,
            unitPrice: quote.totalAmount,
            totalPrice: quote.totalAmount,
          },
        ],
      },
      {
        correlationId: event.metadata.correlationId ?? uuidv4(),
        causationId: event.metadata.id,
      },
    );
  }
}
