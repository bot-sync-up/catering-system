/**
 * publish.ts - helper פונקציונאלי לפרסום אירוע יחיד.
 *
 * שימושי כאשר רוצים לפרסם בלי לשמור instance של EventBus
 * (לדוגמה בתסריטי CLI או scripts חד-פעמיים).
 */

import { EventBus, type EventBusConfig, type PublishOptions } from './EventBus.js';
import type { DomainEventMap, DomainEventName } from './types.js';

export async function publish<K extends DomainEventName>(
  config: EventBusConfig,
  name: K,
  payload: DomainEventMap[K],
  options?: PublishOptions,
): Promise<string> {
  const bus = new EventBus(config);
  try {
    return await bus.publish(name, payload, options);
  } finally {
    await bus.stop();
  }
}
