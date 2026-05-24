/**
 * subscribe-all.ts - אתחול מרכזי של כל ה-11 adapters והחיבור שלהם ל-EventBus.
 *
 * שימוש לדוגמה (משירות monolith / orchestrator):
 *   const bus = new EventBus({ redisUrl, source: 'orchestrator' });
 *   const adapters = await subscribeAll({ bus, redisUrl, clients });
 *   await bus.start();
 *   ...
 *   await Promise.all(adapters.map((a) => a.stop()));
 *   await bus.stop();
 */

import type { EventBus } from '@catering/event-bus';
import {
  CrmToFinanceAdapter,
  PortalToOrdersAdapter,
  OrdersToFinanceAdapter,
  OrdersToKitchenAdapter,
  OrdersToEventsAdapter,
  OrdersToLogisticsAdapter,
  FinanceToIcountAdapter,
  FinanceToCardcomAdapter,
  CardcomToFinanceAdapter,
  InventoryToPurchasingAdapter,
  HrToPayrollAdapter,
  type FinanceQuoteClient,
  type CrmLookup,
  type OrdersClient,
  type InvoiceClient,
  type OrdersLookup,
  type KitchenClient,
  type EventsScheduler,
  type LogisticsClient,
  type IcountClient,
  type CardcomClient,
  type FinanceClient,
  type PurchasingClient,
  type PayrollClient,
} from '@catering/integration-adapters';

/**
 * מאגד כל ה-clients הנדרשים ע"י ה-adapters. כל אפליקציה יוצרת
 * implementation משלה ומזריקה אותו ל-subscribeAll.
 */
export interface SubscribeAllClients {
  /** ל-CrmToFinanceAdapter */
  finance: FinanceQuoteClient & FinanceClient;
  /** ל-CrmToFinanceAdapter */
  crm: CrmLookup;
  /** ל-PortalToOrdersAdapter */
  ordersService: OrdersClient;
  /** ל-OrdersToFinanceAdapter */
  invoice: InvoiceClient;
  /** ל-OrdersToFinanceAdapter / OrdersToKitchenAdapter */
  ordersLookup: OrdersLookup & {
    getOrderItems: (orderId: string) => Promise<
      Array<{ sku: string; name: string; quantity: number }>
    >;
  };
  /** ל-OrdersToKitchenAdapter */
  kitchen: KitchenClient;
  /** ל-OrdersToEventsAdapter */
  scheduler: EventsScheduler;
  /** ל-OrdersToLogisticsAdapter */
  logistics: LogisticsClient;
  /** ל-FinanceToIcountAdapter */
  icount: IcountClient;
  /** ל-FinanceToCardcomAdapter */
  cardcom: CardcomClient;
  /** ל-InventoryToPurchasingAdapter */
  purchasing: PurchasingClient;
  /** ל-HrToPayrollAdapter */
  payroll: PayrollClient;
}

export interface SubscribeAllOptions {
  bus: EventBus;
  redisUrl: string;
  clients: SubscribeAllClients;
  /** אופציה לדלג על adapters ספציפיים (e.g. בסביבת tests) */
  skip?: ReadonlyArray<AdapterName>;
}

export type AdapterName =
  | 'crm-to-finance'
  | 'portal-to-orders'
  | 'orders-to-finance'
  | 'orders-to-kitchen'
  | 'orders-to-events'
  | 'orders-to-logistics'
  | 'finance-to-icount'
  | 'finance-to-cardcom'
  | 'cardcom-to-finance'
  | 'inventory-to-purchasing'
  | 'hr-to-payroll';

export interface StartedAdapters {
  /** רשימת ה-adapters המופעלים. החזרה לצורך stop() מסודר */
  adapters: Array<{
    name: AdapterName;
    stop: () => Promise<void>;
  }>;
}

/**
 * רושם את כל 11 ה-adapters ל-bus וקורא ל-start() על כל אחד.
 * מחזיר רשימה כדי שניתן יהיה לעצור באופן מסודר.
 */
export async function subscribeAll(
  opts: SubscribeAllOptions,
): Promise<StartedAdapters> {
  const { bus, redisUrl, clients, skip = [] } = opts;
  const skipSet = new Set<AdapterName>(skip);

  const all = [
    {
      name: 'crm-to-finance' as const,
      create: () =>
        new CrmToFinanceAdapter({
          bus,
          redisUrl,
          finance: clients.finance,
          crm: clients.crm,
        }),
    },
    {
      name: 'portal-to-orders' as const,
      create: () =>
        new PortalToOrdersAdapter({
          bus,
          redisUrl,
          orders: clients.ordersService,
        }),
    },
    {
      name: 'orders-to-finance' as const,
      create: () =>
        new OrdersToFinanceAdapter({
          bus,
          redisUrl,
          invoice: clients.invoice,
          orders: clients.ordersLookup,
        }),
    },
    {
      name: 'orders-to-kitchen' as const,
      create: () =>
        new OrdersToKitchenAdapter({
          bus,
          redisUrl,
          kitchen: clients.kitchen,
          orders: clients.ordersLookup,
        }),
    },
    {
      name: 'orders-to-events' as const,
      create: () =>
        new OrdersToEventsAdapter({
          bus,
          redisUrl,
          scheduler: clients.scheduler,
        }),
    },
    {
      name: 'orders-to-logistics' as const,
      create: () =>
        new OrdersToLogisticsAdapter({
          bus,
          redisUrl,
          logistics: clients.logistics,
        }),
    },
    {
      name: 'finance-to-icount' as const,
      create: () =>
        new FinanceToIcountAdapter({
          bus,
          redisUrl,
          icount: clients.icount,
        }),
    },
    {
      name: 'finance-to-cardcom' as const,
      create: () =>
        new FinanceToCardcomAdapter({
          bus,
          redisUrl,
          cardcom: clients.cardcom,
        }),
    },
    {
      name: 'cardcom-to-finance' as const,
      create: () =>
        new CardcomToFinanceAdapter({
          bus,
          redisUrl,
          finance: clients.finance,
        }),
    },
    {
      name: 'inventory-to-purchasing' as const,
      create: () =>
        new InventoryToPurchasingAdapter({
          bus,
          redisUrl,
          purchasing: clients.purchasing,
        }),
    },
    {
      name: 'hr-to-payroll' as const,
      create: () =>
        new HrToPayrollAdapter({
          bus,
          redisUrl,
          payroll: clients.payroll,
        }),
    },
  ];

  const adapters: StartedAdapters['adapters'] = [];
  for (const entry of all) {
    if (skipSet.has(entry.name)) continue;
    const adapter = entry.create();
    await adapter.start();
    adapters.push({ name: entry.name, stop: () => adapter.stop() });
  }

  return { adapters };
}
