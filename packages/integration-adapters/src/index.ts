/**
 * @catering/integration-adapters — public API.
 *
 * 11 adapters + BaseAdapter + idempotency/DLQ helpers.
 */
export { BaseAdapter, InMemoryIdempotencyStore, InMemoryDLQ } from './BaseAdapter.js';
export type { BaseAdapterOptions, IdempotencyStore, DeadLetterQueue } from './BaseAdapter.js';

export { CrmToFinanceAdapter } from './crm-to-finance.adapter.js';
export type { CrmToFinanceAdapterOptions, FinanceClient } from './crm-to-finance.adapter.js';

export { PortalToOrdersAdapter } from './portal-to-orders.adapter.js';
export type { PortalToOrdersAdapterOptions, OrdersClient } from './portal-to-orders.adapter.js';

export { OrdersToFinanceAdapter } from './orders-to-finance.adapter.js';
export type { OrdersToFinanceAdapterOptions, FinanceInvoiceClient } from './orders-to-finance.adapter.js';

export { OrdersToKitchenAdapter } from './orders-to-kitchen.adapter.js';
export type { OrdersToKitchenAdapterOptions, KitchenClient } from './orders-to-kitchen.adapter.js';

export { OrdersToEventsAdapter } from './orders-to-events.adapter.js';
export type { OrdersToEventsAdapterOptions, EventsClient } from './orders-to-events.adapter.js';

export { OrdersToLogisticsAdapter } from './orders-to-logistics.adapter.js';
export type { OrdersToLogisticsAdapterOptions, LogisticsClient } from './orders-to-logistics.adapter.js';

export { FinanceToICountAdapter, MockICountClient } from './finance-to-icount.adapter.js';
export type { FinanceToICountAdapterOptions, ICountClient } from './finance-to-icount.adapter.js';

export { FinanceToCardcomAdapter, MockCardcomClient } from './finance-to-cardcom.adapter.js';
export type { FinanceToCardcomAdapterOptions, CardcomClient } from './finance-to-cardcom.adapter.js';

export { CardcomToFinanceAdapter } from './cardcom-to-finance.adapter.js';
export type { CardcomToFinanceAdapterOptions, FinanceStatusClient, CardcomWebhookPayload } from './cardcom-to-finance.adapter.js';

export { InventoryToPurchasingAdapter } from './inventory-to-purchasing.adapter.js';
export type { InventoryToPurchasingAdapterOptions, PurchasingClient } from './inventory-to-purchasing.adapter.js';

export { HrToPayrollAdapter } from './hr-to-payroll.adapter.js';
export type { HrToPayrollAdapterOptions, PayrollClient } from './hr-to-payroll.adapter.js';
