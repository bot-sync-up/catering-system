/**
 * subscribe.ts - helper פונקציונאלי לרישום מספר handlers בבת אחת.
 *
 * שימוש לדוגמה:
 * ```ts
 * const bus = await subscribeAll(config, {
 *   'lead.created': handleLeadCreated,
 *   'order.placed': handleOrderPlaced,
 * });
 * ```
 */

import { EventBus, type EventBusConfig, type SubscribeOptions } from './EventBus.js';
import type { DomainEventMap, DomainEventName, EventHandler } from './types.js';

export type HandlerMap = {
  [K in DomainEventName]?: EventHandler<K>;
};

export async function subscribeAll(
  config: EventBusConfig,
  handlers: HandlerMap,
  options?: SubscribeOptions,
): Promise<EventBus> {
  const bus = new EventBus(config);
  for (const [name, handler] of Object.entries(handlers)) {
    if (!handler) continue;
    bus.subscribe(
      name as DomainEventName,
      handler as EventHandler<DomainEventName>,
      options,
    );
  }
  await bus.start();
  return bus;
}
