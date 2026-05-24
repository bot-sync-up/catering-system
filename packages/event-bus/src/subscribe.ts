/**
 * subscribe.ts — helpers להירשם ל-events בצורה נוחה.
 */
import type { EventBus } from './EventBus.js';
import type { EventHandler, EventName } from './types.js';

/**
 * הירשם ל-event בודד.
 * עוטף את `bus.subscribe` כדי לאפשר חתימה functional.
 */
export function subscribeEvent<TName extends EventName>(
  bus: EventBus,
  name: TName,
  handler: EventHandler<TName>
): void {
  bus.subscribe(name, handler);
}

/**
 * הירשם למספר events בפעולה אחת.
 */
export function subscribeMany(
  bus: EventBus,
  subscriptions: Array<{
    [K in EventName]: { name: K; handler: EventHandler<K> };
  }[EventName]>
): void {
  for (const sub of subscriptions) {
    bus.subscribe(sub.name, sub.handler as never);
  }
}
