/**
 * CrmPublisher - אחראי לפרסום אירועי CRM ל-EventBus.
 *
 * מודול ה-CRM קורא לפונקציות אלה אחרי שעבר create/update בטבלאות
 * Lead / Customer. ה-publisher עוטף את ה-EventBus עם API דומיין-ספציפי.
 *
 * אירועים מטופלים:
 *  - lead.created     - לאחר יצירת ליד חדש
 *  - lead.qualified   - לאחר שליד עבר qualification ע"י נציג מכירות
 *  - customer.created - לאחר המרת ליד ללקוח רשום
 */

import pino, { type Logger } from 'pino';
import type { EventBus } from '@catering/event-bus';
import type { PublisherBaseOptions, PublishContext } from './types.js';

export interface CrmPublisherOptions extends PublisherBaseOptions {}

export interface LeadCreatedInput {
  leadId: string;
  customerName: string;
  phone: string;
  email?: string;
  source: 'website' | 'phone' | 'referral' | 'portal';
  eventType?: string;
  guestsEstimate?: number;
  eventDateEstimate?: string;
}

export interface LeadQualifiedInput {
  leadId: string;
  qualifiedBy: string;
  score: number;
  notes?: string;
}

export interface CustomerCreatedInput {
  customerId: string;
  leadId?: string;
  name: string;
  email?: string;
  phone: string;
}

export class CrmPublisher {
  private readonly bus: EventBus;
  private readonly logger: Logger;

  constructor(opts: CrmPublisherOptions) {
    this.bus = opts.bus;
    this.logger = opts.logger ?? pino({ name: 'publisher:crm' });
  }

  async publishLeadCreated(
    input: LeadCreatedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.debug({ leadId: input.leadId }, 'מפרסם lead.created');
    return this.bus.publish('lead.created', input, ctx);
  }

  async publishLeadQualified(
    input: LeadQualifiedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.debug({ leadId: input.leadId }, 'מפרסם lead.qualified');
    return this.bus.publish('lead.qualified', input, ctx);
  }

  /**
   * customer.created אינו חלק מה-DomainEventMap המקורי - אם אתם רוצים
   * להוסיף אותו, יש להרחיב את types.ts ב-event-bus. בינתיים אנו ממפים
   * customer.created ל-lead.qualified (המרת ליד = יצירת לקוח).
   */
  async publishCustomerCreated(
    input: CustomerCreatedInput,
    ctx: PublishContext = {},
  ): Promise<string | null> {
    this.logger.info(
      { customerId: input.customerId },
      'מפרסם customer.created (כ-lead.qualified עם score=100)',
    );
    if (!input.leadId) {
      this.logger.warn(
        { customerId: input.customerId },
        'אין leadId - לא ניתן לפרסם lead.qualified',
      );
      return null;
    }
    return this.bus.publish(
      'lead.qualified',
      {
        leadId: input.leadId,
        qualifiedBy: 'system:customer-conversion',
        score: 100,
        notes: `המרה ללקוח רשום (customerId=${input.customerId})`,
      },
      ctx,
    );
  }
}
