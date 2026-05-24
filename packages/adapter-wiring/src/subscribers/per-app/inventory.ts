/**
 * Inventory app subscription registration.
 *
 * adapter יחיד: InventoryToPurchasingAdapter (inventory.low → PO).
 */

import type { EventBus } from '@catering/event-bus';
import {
  InventoryToPurchasingAdapter,
  type PurchasingClient,
} from '@catering/integration-adapters';

export interface InventorySubscriptionDeps {
  bus: EventBus;
  redisUrl: string;
  purchasing: PurchasingClient;
}

export interface InventorySubscriptionHandle {
  stop: () => Promise<void>;
}

export async function registerInventorySubscriptions(
  deps: InventorySubscriptionDeps,
): Promise<InventorySubscriptionHandle> {
  const adapter = new InventoryToPurchasingAdapter({
    bus: deps.bus,
    redisUrl: deps.redisUrl,
    purchasing: deps.purchasing,
  });
  await adapter.start();
  return { stop: () => adapter.stop() };
}
