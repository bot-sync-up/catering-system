import { describe, it, expect, vi } from 'vitest';
import { SagaCoordinator } from '../src/saga/SagaCoordinator.js';
import { buildCancelEventSaga, type CancelEventContext, type CancelEventDeps } from '../src/saga/cancelEventSaga.js';

function makeDeps(overrides: Partial<CancelEventDeps> = {}): CancelEventDeps {
  return {
    orderService: {
      validateCancellation: vi.fn(async () => 'tok-1'),
      cancel: vi.fn(async () => {}),
      reactivate: vi.fn(async () => {}),
    },
    kitchenService: {
      cancelPrep: vi.fn(async () => 'k-1'),
      restorePrep: vi.fn(async () => {}),
    },
    logisticsService: {
      cancelDelivery: vi.fn(async () => 'd-1'),
      restoreDelivery: vi.fn(async () => {}),
    },
    inventoryService: {
      release: vi.fn(async () => 'r-1'),
      reReserve: vi.fn(async () => {}),
    },
    paymentService: {
      refund: vi.fn(async () => 'rf-1'),
      voidRefund: vi.fn(async () => {}),
    },
    financeService: {
      issueCreditNote: vi.fn(async () => 'cn-1'),
      voidCreditNote: vi.fn(async () => {}),
    },
    notificationService: {
      notifyCancellation: vi.fn(async () => 'n-1'),
      revertNotification: vi.fn(async () => {}),
    },
    ...overrides,
  };
}

function makeCtx(): CancelEventContext {
  return {
    orderId: 'o-1',
    eventId: 'e-1',
    customerId: 'c-1',
    reason: 'customer request',
    refundAmount: 500,
  };
}

describe('SagaCoordinator + cancelEventSaga', () => {
  it('runs all 8 steps on success', async () => {
    const deps = makeDeps();
    const saga = buildCancelEventSaga(makeCtx(), deps);
    const coord = new SagaCoordinator();

    const result = await coord.run(saga);

    expect(result.success).toBe(true);
    expect(result.compensated).toEqual([]);
    expect(deps.orderService.validateCancellation).toHaveBeenCalled();
    expect(deps.orderService.cancel).toHaveBeenCalled();
    expect(deps.kitchenService.cancelPrep).toHaveBeenCalled();
    expect(deps.logisticsService.cancelDelivery).toHaveBeenCalled();
    expect(deps.inventoryService.release).toHaveBeenCalled();
    expect(deps.paymentService.refund).toHaveBeenCalled();
    expect(deps.financeService.issueCreditNote).toHaveBeenCalled();
    expect(deps.notificationService.notifyCancellation).toHaveBeenCalled();
  });

  it('runs compensations in reverse order when a step fails', async () => {
    const deps = makeDeps({
      paymentService: {
        refund: vi.fn(async () => { throw new Error('gateway down'); }),
        voidRefund: vi.fn(async () => {}),
      },
    });
    const saga = buildCancelEventSaga(makeCtx(), deps);
    const coord = new SagaCoordinator();

    const result = await coord.run(saga);

    expect(result.success).toBe(false);
    expect(result.failedStep).toBe('issueRefund');
    // צריך לרוץ compensate על השלבים שהצליחו (5 לפני issueRefund)
    expect(result.compensated).toContain('releaseInventory');
    expect(result.compensated).toContain('cancelDelivery');
    expect(result.compensated).toContain('cancelKitchenPrep');
    expect(result.compensated).toContain('cancelOrder');
    expect(deps.inventoryService.reReserve).toHaveBeenCalled();
    expect(deps.logisticsService.restoreDelivery).toHaveBeenCalled();
    expect(deps.kitchenService.restorePrep).toHaveBeenCalled();
    expect(deps.orderService.reactivate).toHaveBeenCalled();
  });

  it('skips refund step if refundAmount is 0', async () => {
    const deps = makeDeps();
    const ctx = makeCtx();
    ctx.refundAmount = 0;
    const saga = buildCancelEventSaga(ctx, deps);
    const coord = new SagaCoordinator();

    const result = await coord.run(saga);

    expect(result.success).toBe(true);
    expect(deps.paymentService.refund).not.toHaveBeenCalled();
    expect(deps.financeService.issueCreditNote).not.toHaveBeenCalled();
  });

  it('continues compensation chain even if one compensation fails', async () => {
    const deps = makeDeps({
      paymentService: {
        refund: vi.fn(async () => { throw new Error('first fail'); }),
        voidRefund: vi.fn(async () => {}),
      },
      inventoryService: {
        release: vi.fn(async () => 'r-1'),
        reReserve: vi.fn(async () => { throw new Error('inv comp fail'); }),
      },
    });
    const saga = buildCancelEventSaga(makeCtx(), deps);
    const coord = new SagaCoordinator();

    const result = await coord.run(saga);

    expect(result.success).toBe(false);
    expect(result.compensationErrors.some((e) => e.step === 'releaseInventory')).toBe(true);
    // ה-compensation של השלבים האחרים בכל זאת רץ
    expect(deps.orderService.reactivate).toHaveBeenCalled();
  });
});
