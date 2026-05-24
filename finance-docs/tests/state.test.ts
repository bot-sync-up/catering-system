import { describe, it, expect } from 'vitest';
import { canConvert, canTransition, isTaxDoc } from '../src/lib/state.js';

describe('state machine', () => {
  it('legal conversions', () => {
    expect(canConvert('QUOTE', 'ORDER')).toBe(true);
    expect(canConvert('ORDER', 'TAX_INVOICE')).toBe(true);
    expect(canConvert('TAX_INVOICE', 'CREDIT_NOTE')).toBe(true);
    expect(canConvert('TAX_INVOICE', 'QUOTE')).toBe(false);
    expect(canConvert('RECEIPT', 'TAX_INVOICE')).toBe(false);
  });
  it('legal status transitions', () => {
    expect(canTransition('DRAFT', 'ISSUED')).toBe(true);
    expect(canTransition('PAID', 'DRAFT')).toBe(false);
    expect(canTransition('CANCELLED', 'ISSUED')).toBe(false);
    expect(canTransition('ISSUED', 'OVERDUE')).toBe(true);
  });
  it('isTaxDoc', () => {
    expect(isTaxDoc('TAX_INVOICE')).toBe(true);
    expect(isTaxDoc('QUOTE')).toBe(false);
  });
});
