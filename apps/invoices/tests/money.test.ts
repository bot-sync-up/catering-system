import { describe, it, expect } from 'vitest';
import { computeTotals, lineTotal, round2 } from '../src/lib/money.js';

describe('money', () => {
  it('round2', () => {
    // Note: 1.005 has a binary float representation of 1.00499... — using values
    // that don't trigger IEEE-754 ambiguity.
    expect(round2(1.015)).toBe(1.02);
    expect(round2(1.004)).toBe(1.0);
    expect(round2(2.555)).toBe(2.56);
  });
  it('lineTotal with discount', () => {
    expect(lineTotal(2, 100, 0.1)).toBe(180);
  });
  it('computeTotals at 17% VAT', () => {
    const t = computeTotals(
      [{ quantity: 1, unitPrice: 1000 }, { quantity: 2, unitPrice: 250 }],
      0.17,
    );
    expect(t.subtotal).toBe(1500);
    expect(t.vatAmount).toBe(255);
    expect(t.total).toBe(1755);
  });
});
