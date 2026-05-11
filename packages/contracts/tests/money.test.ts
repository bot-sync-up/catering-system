import { describe, it, expect } from 'vitest';
import {
  money,
  addMoney,
  mulMoney,
  vatAmount,
  withVat,
  toDecimal,
  MoneySchema,
  VAT_RATE,
} from '../src/common/money.js';
import { Currency } from '../src/enums/Currency.js';

describe('Money', () => {
  it('creates Money from string/number with default ILS', () => {
    const m = money('100.50');
    expect(m.amount).toBe('100.5');
    expect(m.currency).toBe(Currency.ILS);
  });

  it('rejects invalid amount string', () => {
    const parsed = MoneySchema.safeParse({ amount: 'foo', currency: 'ILS' });
    expect(parsed.success).toBe(false);
  });

  it('adds money in same currency', () => {
    const r = addMoney(money('10'), money('20.25'));
    expect(r.amount).toBe('30.25');
  });

  it('refuses adding mismatched currencies', () => {
    expect(() => addMoney(money('10', Currency.ILS), money('20', Currency.USD))).toThrow();
  });

  it('multiplies money by qty', () => {
    const r = mulMoney(money('3.33'), 3);
    expect(r.amount).toBe('9.99');
  });

  it('computes 18% VAT', () => {
    const v = vatAmount(money('100'));
    expect(v.amount).toBe('18');
    expect(VAT_RATE.toFixed(2)).toBe('0.18');
  });

  it('adds VAT to net', () => {
    const gross = withVat(money('100'));
    expect(toDecimal(gross).toFixed(2)).toBe('118.00');
  });
});
