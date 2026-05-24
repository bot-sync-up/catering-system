import { describe, it, expect } from 'vitest';
import { ORDER_TRANSITIONS, OrderStatus } from '../src/enums/OrderStatus.js';

describe('OrderStatus transitions', () => {
  it('DRAFT can move to QUOTED or CANCELLED', () => {
    expect(ORDER_TRANSITIONS.DRAFT).toContain('QUOTED');
    expect(ORDER_TRANSITIONS.DRAFT).toContain('CANCELLED');
  });

  it('CANCELLED is terminal', () => {
    expect(ORDER_TRANSITIONS.CANCELLED).toHaveLength(0);
  });

  it('REFUNDED is terminal', () => {
    expect(ORDER_TRANSITIONS.REFUNDED).toHaveLength(0);
  });

  it('exposes status enum', () => {
    expect(OrderStatus.DRAFT).toBe('DRAFT');
    expect(OrderStatus.COMPLETED).toBe('COMPLETED');
  });
});
