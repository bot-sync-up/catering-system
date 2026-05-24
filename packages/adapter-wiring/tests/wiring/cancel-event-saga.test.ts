/**
 * Integration test: cancel-event saga - הרצה מלאה + compensation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildCancelEventSaga, type CancelEventServices } from '@catering/event-bus/saga';

function buildServices(overrides: Partial<CancelEventServices> = {}): CancelEventServices {
  return {
    auth: {
      verifyCancelPermission: vi.fn(async () => 'token-1'),
      revokeCancellation: vi.fn(async () => {}),
    },
    orders: {
      cancel: vi.fn(async () => {}),
      restore: vi.fn(async () => {}),
    },
    kitchen: {
      cancelTasks: vi.fn(async () => ['task-1', 'task-2']),
      restoreTasks: vi.fn(async () => {}),
    },
    events: {
      unschedule: vi.fn(async () => {}),
      reschedule: vi.fn(async () => {}),
    },
    logistics: {
      cancelDelivery: vi.fn(async () => 'del-1'),
      restoreDelivery: vi.fn(async () => {}),
    },
    inventory: {
      returnItems: vi.fn(async () => [{ sku: 'sku-1', quantity: 5 }]),
      reReserveItems: vi.fn(async () => {}),
    },
    hr: {
      releaseStaff: vi.fn(async () => ['emp-1', 'emp-2']),
      reAssignStaff: vi.fn(async () => {}),
    },
    finance: {
      issueRefund: vi.fn(async () => 'refund-1'),
      revokeRefund: vi.fn(async () => {}),
    },
    ...overrides,
  };
}

describe('SAGA: cancel-event', () => {
  it('מריץ את כל 8 השלבים בהצלחה', async () => {
    const services = buildServices();
    const saga = buildCancelEventSaga(services);

    const result = await saga.run({
      eventId: 'evt-1',
      orderId: 'ord-1',
      customerId: 'cust-1',
      reason: 'לקוח ביטל',
      cancelledBy: 'user-1',
    });

    expect(result.status).toBe('completed');
    expect(result.completedSteps).toHaveLength(8);
    expect(services.orders.cancel).toHaveBeenCalledTimes(1);
    expect(services.finance.issueRefund).toHaveBeenCalledTimes(1);
  });

  it('כשנכשל issue-refund — מבצע compensate על כל ה-7 שלפניו', async () => {
    const services = buildServices({
      finance: {
        issueRefund: vi.fn(async () => {
          throw new Error('CardCom unavailable');
        }),
        revokeRefund: vi.fn(async () => {}),
      },
    });
    const saga = buildCancelEventSaga(services);

    const result = await saga.run({
      eventId: 'evt-2',
      orderId: 'ord-2',
      customerId: 'cust-2',
      reason: 'בדיקה',
      cancelledBy: 'user-2',
    });

    expect(result.status).toBe('compensated');
    expect(result.error).toContain('CardCom unavailable');
    // compensate חוזר אחורה - הראשון שירוץ הוא release-staff שדואג ל-reAssignStaff
    expect(services.hr.reAssignStaff).toHaveBeenCalled();
    expect(services.inventory.reReserveItems).toHaveBeenCalled();
    expect(services.logistics.restoreDelivery).toHaveBeenCalled();
    expect(services.events.reschedule).toHaveBeenCalled();
    expect(services.kitchen.restoreTasks).toHaveBeenCalled();
    expect(services.orders.restore).toHaveBeenCalled();
    expect(services.auth.revokeCancellation).toHaveBeenCalled();
  });
});
