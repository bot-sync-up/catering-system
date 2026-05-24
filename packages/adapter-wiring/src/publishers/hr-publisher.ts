/**
 * HrPublisher - אירועי HR ומשאבי אנוש.
 *
 * אירועים:
 *  - employee.clocked - עובד הזדמן/יצא (clock-in/clock-out)
 *  - month.closed     - HR סגר חודש (trigger לחישוב משכורות)
 */

import pino, { type Logger } from 'pino';
import type { EventBus } from '@catering/event-bus';
import type { PublisherBaseOptions, PublishContext } from './types.js';

export interface HrPublisherOptions extends PublisherBaseOptions {}

export interface EmployeeClockedInput {
  employeeId: string;
  action: 'clock-in' | 'clock-out';
  timestamp?: string;
  location?: string;
  eventId?: string;
}

export interface MonthClosedInput {
  period: string;
  closedAt?: string;
  closedBy: string;
}

export class HrPublisher {
  private readonly bus: EventBus;
  private readonly logger: Logger;

  constructor(opts: HrPublisherOptions) {
    this.bus = opts.bus;
    this.logger = opts.logger ?? pino({ name: 'publisher:hr' });
  }

  async publishEmployeeClocked(
    input: EmployeeClockedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.debug(
      { employeeId: input.employeeId, action: input.action },
      'מפרסם employee.clocked',
    );
    return this.bus.publish(
      'employee.clocked',
      {
        employeeId: input.employeeId,
        action: input.action,
        timestamp: input.timestamp ?? new Date().toISOString(),
        location: input.location,
        eventId: input.eventId,
      },
      ctx,
    );
  }

  async publishMonthClosed(
    input: MonthClosedInput,
    ctx: PublishContext = {},
  ): Promise<string> {
    this.logger.info({ period: input.period }, 'מפרסם month.closed');
    return this.bus.publish(
      'month.closed',
      {
        period: input.period,
        closedAt: input.closedAt ?? new Date().toISOString(),
        closedBy: input.closedBy,
      },
      ctx,
    );
  }
}
