/**
 * Portal app subscription registration.
 *
 * adapter יחיד: PortalToOrdersAdapter (portal.submitted → order.placed).
 */

import type { EventBus } from '@catering/event-bus';
import {
  PortalToOrdersAdapter,
  type OrdersClient,
} from '@catering/integration-adapters';

export interface PortalSubscriptionDeps {
  bus: EventBus;
  redisUrl: string;
  orders: OrdersClient;
}

export interface PortalSubscriptionHandle {
  stop: () => Promise<void>;
}

export async function registerPortalSubscriptions(
  deps: PortalSubscriptionDeps,
): Promise<PortalSubscriptionHandle> {
  const adapter = new PortalToOrdersAdapter({
    bus: deps.bus,
    redisUrl: deps.redisUrl,
    orders: deps.orders,
  });
  await adapter.start();
  return { stop: () => adapter.stop() };
}
