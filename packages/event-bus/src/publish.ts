/**
 * publish.ts — helper functions לפרסום events.
 *
 * השימוש הקנוני הוא דרך `EventBus.publish`, אבל helpers אלה
 * נוחים ל-call sites בלי ה-instance.
 */
import type { EventBus } from './EventBus.js';
import type { DomainEvent, EventName, EventTypeMap, PublishOptions } from './types.js';

/**
 * פרסם event דרך bus קיים.
 * שקול שימוש לאירועים תכופים שלא רוצים לחשוף את האובייקט כולו.
 */
export async function publishEvent<TName extends EventName>(
  bus: EventBus,
  name: TName,
  payload: EventTypeMap[TName],
  options?: PublishOptions
): Promise<DomainEvent<TName, EventTypeMap[TName]>> {
  return bus.publish(name, payload, options);
}

/**
 * פרסום מספר events כקבוצה (publish-many).
 * אם אחד נכשל, מטלת ה-DLQ של BullMQ תטפל בו — לא כושל את כל הקבוצה.
 */
export async function publishMany(
  bus: EventBus,
  events: Array<{
    [K in EventName]: { name: K; payload: EventTypeMap[K]; options?: PublishOptions };
  }[EventName]>
): Promise<void> {
  for (const e of events) {
    await bus.publish(e.name, e.payload as never, e.options);
  }
}
