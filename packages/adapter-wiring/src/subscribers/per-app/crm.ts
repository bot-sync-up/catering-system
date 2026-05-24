/**
 * CRM app subscription registration.
 *
 * רושם רק את ה-adapters שצריכים להפעל מתוך תהליך ה-CRM:
 *  - CrmToFinanceAdapter (מאזין ל-lead.qualified, יוצר Quote)
 */

import type { EventBus } from '@catering/event-bus';
import {
  CrmToFinanceAdapter,
  type FinanceQuoteClient,
  type CrmLookup,
} from '@catering/integration-adapters';

export interface CrmSubscriptionDeps {
  bus: EventBus;
  redisUrl: string;
  finance: FinanceQuoteClient;
  crm: CrmLookup;
}

export interface CrmSubscriptionHandle {
  adapter: CrmToFinanceAdapter;
  stop: () => Promise<void>;
}

export async function registerCrmSubscriptions(
  deps: CrmSubscriptionDeps,
): Promise<CrmSubscriptionHandle> {
  const adapter = new CrmToFinanceAdapter({
    bus: deps.bus,
    redisUrl: deps.redisUrl,
    finance: deps.finance,
    crm: deps.crm,
  });
  await adapter.start();
  return { adapter, stop: () => adapter.stop() };
}
