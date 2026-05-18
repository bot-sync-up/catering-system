/**
 * saga.test.ts - בדיקות ל-SagaCoordinator ול-cancelEventSaga.
 */

import { describe, it, expect, vi } from 'vitest';
import { SagaCoordinator } from '../src/saga/SagaCoordinator.js';
import {
  buildCancelEventSaga,
  type CancelEventServices,
} from '../src/saga/cancelEventSaga.js';

const buildMockServices = (
  overrides: Partial<Record<keyof CancelEventServices, Partial<unknown>>> = {},
): CancelEventServices => ({
  auth: {
    verifyCancelPermission: vi.fn(async () => 'tok-1'),
    revokeCancellation: vi.fn(async () => {}),
    ...(overrides.auth as object),
  },
  orders: {
    cancel: vi.fn(async () => {}),
    restore: vi.fn(async () => {}),
    ...(overrides.orders as object),
  },
  kitchen: {
    cancelTasks: vi.fn(async () => ['k1', 'k2']),
    restoreTasks: vi.fn(async () => {}),
    ...(overrides.kitchen as object),
  },
  events: {
    unschedule: vi.fn(async () => {}),
    reschedule: vi.fn(async () => {}),
    ...(overrides.events as object),
  },
  logistics: {
    cancelDelivery: vi.fn(async () => 'del-1'),
    restoreDelivery: vi.fn(async () => {}),
    ...(overrides.logistics as object),
  },
  inventory: {
    returnItems: vi.fn(async () => [{ sku: 'A', quantity: 10 }]),
    reReserveItems: vi.fn(async () => {}),
    ...(overrides.inventory as object),
  },
  hr: {
    releaseStaff: vi.fn(async () => ['e1']),
    reAssignStaff: vi.fn(async () => {}),
    ...(overrides.hr as object),
  },
  finance: {
    issueRefund: vi.fn(async () => 'ref-1'),
    revokeRefund: vi.fn(async () => {}),
    ...(overrides.finance as object),
  },
});

describe('SagaCoordinator', () => {
  it('מריץ saga בהצלחה כשכל ה-steps מצליחים', async () => {
    type Ctx = { value: number };
    const saga = new SagaCoordinator<Ctx>('test');
    saga.addStep({
      name: 'step1',
      execute: async (ctx) => {
        ctx.value += 1;
      },
    });
    saga.addStep({
      name: 'step2',
      execute: async (ctx) => {
        ctx.value *= 2;
      },
    });

    const result = await saga.run({ value: 5 });
    expect(result.status).toBe('completed');
    expect(result.context.value).toBe(12);
    expect(result.completedSteps).toEqual(['step1', 'step2']);
  });

  it('מבצע compensate בסדר הפוך כשיש כשל', async () => {
    type Ctx = { trail: string[] };
    const saga = new SagaCoordinator<Ctx>('test');
    saga.addStep({
      name: 'a',
      execute: async (ctx) => {
        ctx.trail.push('a-exec');
      },
      compensate: async (ctx) => {
        ctx.trail.push('a-comp');
      },
    });
    saga.addStep({
      name: 'b',
      execute: async (ctx) => {
        ctx.trail.push('b-exec');
      },
      compensate: async (ctx) => {
        ctx.trail.push('b-comp');
      },
    });
    saga.addStep({
      name: 'c',
      execute: async () => {
        throw new Error('crash');
      },
    });

    const result = await saga.run({ trail: [] });
    expect(result.status).toBe('compensated');
    expect(result.context.trail).toEqual([
      'a-exec',
      'b-exec',
      'b-comp',
      'a-comp',
    ]);
    expect(result.compensatedSteps).toEqual(['b', 'a']);
  });

  it('מנסה שוב לפי retries', async () => {
    let attempts = 0;
    const saga = new SagaCoordinator<{ ok: boolean }>('retry', {
      retryDelayMs: 1,
    });
    saga.addStep({
      name: 'flaky',
      retries: 2,
      execute: async (ctx) => {
        attempts++;
        if (attempts < 3) throw new Error('flaky');
        ctx.ok = true;
      },
    });

    const result = await saga.run({ ok: false });
    expect(result.status).toBe('completed');
    expect(attempts).toBe(3);
    expect(result.context.ok).toBe(true);
  });
});

describe('cancelEventSaga', () => {
  it('מריץ את כל 8 השלבים בהצלחה', async () => {
    const services = buildMockServices();
    const saga = buildCancelEventSaga(services);

    const result = await saga.run({
      eventId: 'ev-1',
      orderId: 'ord-1',
      customerId: 'cust-1',
      reason: 'הלקוח ביטל',
      cancelledBy: 'admin-1',
    });

    expect(result.status).toBe('completed');
    expect(result.completedSteps).toHaveLength(8);
    expect(services.auth.verifyCancelPermission).toHaveBeenCalled();
    expect(services.finance.issueRefund).toHaveBeenCalled();
    expect(result.context.refundId).toBe('ref-1');
  });

  it('מבצע compensate כאשר שלב finance נכשל', async () => {
    const services = buildMockServices();
    services.finance.issueRefund = vi.fn(async () => {
      throw new Error('cardcom down');
    });
    const saga = buildCancelEventSaga(services);

    const result = await saga.run({
      eventId: 'ev-2',
      orderId: 'ord-2',
      customerId: 'cust-2',
      reason: 'מזג אוויר',
      cancelledBy: 'admin-1',
    });

    expect(result.status).toBe('compensated');
    expect(services.hr.reAssignStaff).toHaveBeenCalled();
    expect(services.inventory.reReserveItems).toHaveBeenCalled();
    expect(services.logistics.restoreDelivery).toHaveBeenCalledWith('del-1');
    expect(services.events.reschedule).toHaveBeenCalled();
    expect(services.kitchen.restoreTasks).toHaveBeenCalledWith(['k1', 'k2']);
    expect(services.orders.restore).toHaveBeenCalled();
    expect(services.auth.revokeCancellation).toHaveBeenCalledWith('tok-1');
  });
});
