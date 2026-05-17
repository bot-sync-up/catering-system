import { describe, it, expect, beforeEach } from 'vitest';
import { getVatRate, calcVat, withVat, stripVat } from '../src/vatRate';

describe('vatRate', () => {
  beforeEach(() => {
    delete process.env.VAT_RATE_OVERRIDE;
  });

  it('מחזיר 17% עבור 2024', () => {
    expect(getVatRate(new Date('2024-06-15'))).toBe(0.17);
  });

  it('מחזיר 18% עבור 2025', () => {
    expect(getVatRate(new Date('2025-03-01'))).toBe(0.18);
  });

  it('מחזיר 18% עבור 1.1.2025 בדיוק', () => {
    expect(getVatRate(new Date('2025-01-01T00:00:00Z'))).toBe(0.18);
  });

  it('מכבד override מ-env', () => {
    process.env.VAT_RATE_OVERRIDE = '0.20';
    expect(getVatRate()).toBe(0.20);
  });

  it('זורק על override לא חוקי', () => {
    process.env.VAT_RATE_OVERRIDE = 'abc';
    expect(() => getVatRate()).toThrow();
  });

  it('calcVat 1000 ב-2025 = 180', () => {
    expect(calcVat(1000, new Date('2025-06-01'))).toBe(180);
  });

  it('withVat 1000 ב-2025 = 1180', () => {
    expect(withVat(1000, new Date('2025-06-01'))).toBe(1180);
  });

  it('stripVat 1180 ב-2025 = 1000', () => {
    expect(stripVat(1180, new Date('2025-06-01'))).toBe(1000);
  });

  it('calcVat 1000 ב-2024 = 170', () => {
    expect(calcVat(1000, new Date('2024-06-01'))).toBe(170);
  });
});
