/**
 * Orders app subscription registration.
 *
 * הזרימה ב-Orders מפעילה 3 adapters:
 *  - OrdersToFinanceAdapter   (order.approved → invoice.issued)
 *  - OrdersToKitchenAdapter   (order.approved → prep tasks)
 *  - OrdersToEventsAdapter    (order.placed  → event.scheduled)
 *  - OrdersToLogisticsAdapter (event.ready   → delivery.dispatched)
 *
 * הערה: 4 ולא 3 - כולל logistics שמופעל ע"י event.ready.
 * הסיבה: כל ה-flow של "מהזמנה למשלוח" הוא באחריות ה-orders service.
 */

import type { EventBus } from '@catering/event-bus';
import {
  OrdersToFinanceAdapter,
  OrdersToKitchenAdapter,
  OrdersToEventsAdapter,
  OrdersToLogisticsAdapter,
  type InvoiceClient,
  type OrdersLookup,
  type KitchenClient,
  type EventsScheduler,
  type LogisticsClient,
} from '@catering/integration-adapters';

export interface OrdersSubscriptionDeps {
  bus: EventBus;
  redisUrl: string;
  invoice: InvoiceClient;
  ordersLookup: OrdersLookup & {
    getOrderItems: (orderId: string) => Promise<
      Array<{ sku: string; name: string; quantity: number }>
    >;
  };
  kitchen: KitchenClient;
  scheduler: EventsScheduler;
  logistics: LogisticsClient;
}

export interface OrdersSubscriptionHandle {
  stop: () => Promise<void>;
}

export async function registerOrdersSubscriptions(
  deps: OrdersSubscriptionDeps,
): Promise<OrdersSubscriptionHandle> {
  const ordersToFinance = new OrdersToFinanceAdapter({
    bus: deps.bus,
    redisUrl: deps.redisUrl,
    invoice: deps.invoice,
    orders: deps.ordersLookup,
  });
  const ordersToKitchen = new OrdersToKitchenAdapter({
    bus: deps.bus,
    redisUrl: deps.redisUrl,
    kitchen: deps.kitchen,
    orders: deps.ordersLookup,
  });
  const ordersToEvents = new OrdersToEventsAdapter({
    bus: deps.bus,
    redisUrl: deps.redisUrl,
    scheduler: deps.scheduler,
  });
  const ordersToLogistics = new OrdersToLogisticsAdapter({
    bus: deps.bus,
    redisUrl: deps.redisUrl,
    logistics: deps.logistics,
  });

  await Promise.all([
    ordersToFinance.start(),
    ordersToKitchen.start(),
    ordersToEvents.start(),
    ordersToLogistics.start(),
  ]);

  return {
    stop: async () => {
      await Promise.all([
        ordersToFinance.stop(),
        ordersToKitchen.stop(),
        ordersToEvents.stop(),
        ordersToLogistics.stop(),
      ]);
    },
  };
}
