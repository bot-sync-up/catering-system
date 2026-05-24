/**
 * PortalPublisher - אירועים מ-Customer Portal.
 *
 * אירועים:
 *  - portal.submitted - לקוח שלח טופס דרך הפורטל (order / inquiry / event-booking)
 */

import pino, { type Logger } from 'pino';
import type { EventBus } from '@catering/event-bus';
import type { PublisherBaseOptions, PublishContext } from './types.js';

export interface PortalPublisherOptions extends PublisherBaseOptions {}

export interface PortalSubmittedInput {
  submissionId: string;
  customerId: string;
  formType: 'order' | 'inquiry' | 'event-booking';
  data: Record<string, unknown>;
}

export class PortalPublisher {
  private readonly bus: EventBus;
  private readonly logger: Logger;

  constructor(opts: PortalPublisherOptions) {
    this.bus = opts.bus;
    this.logger = opts.logger ?? pino({ name: 'publisher:portal' });
  }

  async publishPortalSubmitted(
    input: PortalSubmittedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.info(
      { submissionId: input.submissionId, formType: input.formType },
      'מפרסם portal.submitted',
    );
    return this.bus.publish('portal.submitted', input, ctx);
  }
}
