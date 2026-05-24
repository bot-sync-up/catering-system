/**
 * Publisher Types - חוזה משותף לכל ה-publishers.
 *
 * כל מודול עסקי (CRM, Orders, Finance, וכו') חושף Publisher
 * שיש לו מתודות publish ייעודיות לאירועי-הדומיין שלו.
 *
 * המתודות מקבלות payload "rich" מהצד הקוראני וממירות אותו
 * ל-DomainEvent הסטנדרטי, כולל metadata (correlation, causation).
 */

import type { EventBus } from '@catering/event-bus';
import type { Logger } from 'pino';

export interface PublisherBaseOptions {
  /** EventBus משותף לכל ה-publishers */
  bus: EventBus;
  /** Logger אופציונלי - אם לא יסופק ייווצר אחד אוטומטית */
  logger?: Logger;
  /** מצב פרסום ברירת מחדל (queue / stream) */
  defaultMode?: 'queue' | 'stream';
}

export interface PublishContext {
  /** מזהה מתאם לשרשור אירועים */
  correlationId?: string;
  /** מזהה האירוע שגרם לאירוע הנוכחי */
  causationId?: string;
}
