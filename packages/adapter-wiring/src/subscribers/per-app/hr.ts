/**
 * HR app subscription registration.
 *
 * adapter יחיד: HrToPayrollAdapter (month.closed → payroll.calculated).
 */

import type { EventBus } from '@catering/event-bus';
import {
  HrToPayrollAdapter,
  type PayrollClient,
} from '@catering/integration-adapters';

export interface HrSubscriptionDeps {
  bus: EventBus;
  redisUrl: string;
  payroll: PayrollClient;
}

export interface HrSubscriptionHandle {
  stop: () => Promise<void>;
}

export async function registerHrSubscriptions(
  deps: HrSubscriptionDeps,
): Promise<HrSubscriptionHandle> {
  const adapter = new HrToPayrollAdapter({
    bus: deps.bus,
    redisUrl: deps.redisUrl,
    payroll: deps.payroll,
  });
  await adapter.start();
  return { stop: () => adapter.stop() };
}
