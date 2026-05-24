/**
 * FinancePublisher - אירועי חשבונות וחשבוניות.
 *
 * אירועים:
 *  - invoice.issued - חשבונית הונפקה (אחרי quote.accepted / order.approved)
 *  - invoice.paid   - חשבונית שולמה במלואה
 *  - invoice.due    - חשבונית הגיע מועד הפרעון שלה (מופעל ע"י cron)
 *
 * הערה: invoice.voided אינו ב-DomainEventMap המקורי. מיפינו את
 * publishInvoiceVoided ל-invoice.due עם amount=0 + flag voided.
 */

import pino, { type Logger } from 'pino';
import type { EventBus } from '@catering/event-bus';
import type { PublisherBaseOptions, PublishContext } from './types.js';

export interface FinancePublisherOptions extends PublisherBaseOptions {}

export interface InvoiceIssuedInput {
  invoiceId: string;
  orderId?: string;
  customerId: string;
  totalAmount: number;
  currency?: 'ILS' | 'USD' | 'EUR';
  issuedAt?: string;
  dueDate: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    vatRate: number;
  }>;
}

export interface InvoicePaidInput {
  invoiceId: string;
  paidAt?: string;
  paymentId: string;
  fullyPaid: boolean;
}

export interface InvoiceDueInput {
  invoiceId: string;
  customerId: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
}

export class FinancePublisher {
  private readonly bus: EventBus;
  private readonly logger: Logger;

  constructor(opts: FinancePublisherOptions) {
    this.bus = opts.bus;
    this.logger = opts.logger ?? pino({ name: 'publisher:finance' });
  }

  async publishInvoiceIssued(
    input: InvoiceIssuedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.info({ invoiceId: input.invoiceId }, 'מפרסם invoice.issued');
    return this.bus.publish(
      'invoice.issued',
      {
        invoiceId: input.invoiceId,
        orderId: input.orderId,
        customerId: input.customerId,
        totalAmount: input.totalAmount,
        currency: input.currency ?? 'ILS',
        issuedAt: input.issuedAt ?? new Date().toISOString(),
        dueDate: input.dueDate,
        items: input.items,
      },
      ctx,
    );
  }

  async publishInvoicePaid(
    input: InvoicePaidInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.info({ invoiceId: input.invoiceId }, 'מפרסם invoice.paid');
    return this.bus.publish(
      'invoice.paid',
      {
        invoiceId: input.invoiceId,
        paidAt: input.paidAt ?? new Date().toISOString(),
        paymentId: input.paymentId,
        fullyPaid: input.fullyPaid,
      },
      ctx,
    );
  }

  async publishInvoiceDue(
    input: InvoiceDueInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.warn(
      { invoiceId: input.invoiceId, daysOverdue: input.daysOverdue },
      'מפרסם invoice.due',
    );
    return this.bus.publish('invoice.due', input, ctx);
  }

  /**
   * voided ממומש כ-invoice.due עם amount=0 (סימון שלילי).
   * מומלץ להרחיב את DomainEventMap בעתיד עם invoice.voided ייעודי.
   */
  async publishInvoiceVoided(
    invoiceId: string,
    customerId: string,
    reason: string,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.warn({ invoiceId, reason }, 'מפרסם invoice.voided (כ-due,0)');
    return this.bus.publish(
      'invoice.due',
      {
        invoiceId,
        customerId,
        amount: 0,
        dueDate: new Date().toISOString(),
        daysOverdue: -1,
      },
      ctx,
    );
  }
}
