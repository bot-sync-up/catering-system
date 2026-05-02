import { describe, it, expect } from 'vitest';
import { planSwap } from '../src/domain/cancellation/swap';

describe('Swap planner', () => {
  it('הזמנה חדשה גדולה מהקרדיט -> לקוח חייב הפרש', () => {
    const r = planSwap({
      oldOrderTotal: 1000,
      refundAvailable: 750,
      newOrderTotal: 1500,
    });
    expect(r.appliedCredit).toBe(750);
    expect(r.amountDueFromCustomer).toBe(750);
    expect(r.amountToRefundCustomer).toBe(0);
  });

  it('הזמנה חדשה קטנה מהקרדיט -> מחזירים את ההפרש', () => {
    const r = planSwap({
      oldOrderTotal: 1000,
      refundAvailable: 800,
      newOrderTotal: 500,
    });
    expect(r.appliedCredit).toBe(500);
    expect(r.amountDueFromCustomer).toBe(0);
    expect(r.amountToRefundCustomer).toBe(300);
  });

  it('הזמנה חדשה זהה לקרדיט', () => {
    const r = planSwap({
      oldOrderTotal: 1000,
      refundAvailable: 600,
      newOrderTotal: 600,
    });
    expect(r.appliedCredit).toBe(600);
    expect(r.amountDueFromCustomer).toBe(0);
    expect(r.amountToRefundCustomer).toBe(0);
  });
});
