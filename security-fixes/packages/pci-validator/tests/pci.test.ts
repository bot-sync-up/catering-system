import { describe, it, expect } from 'vitest';
import { luhnCheck, looksLikePan, scanString, scanObject, assertPciSafe } from '../src/index';

describe('PCI Validator', () => {
  // מספרי בדיקה רשמיים של Stripe (PAN בדיקה — לא חיים)
  const VISA = '4242424242424242';
  const MC = '5555555555554444';
  const AMEX = '378282246310005';
  const FAKE = '1234567890123456';

  it('Luhn מזהה כרטיסים תקפים', () => {
    expect(luhnCheck(VISA)).toBe(true);
    expect(luhnCheck(MC)).toBe(true);
    expect(luhnCheck(AMEX)).toBe(true);
    expect(luhnCheck(FAKE)).toBe(false);
  });

  it('looksLikePan מסנן BIN range', () => {
    expect(looksLikePan(VISA)).toBe(true);
    expect(looksLikePan(AMEX)).toBe(true);
    expect(looksLikePan('0000000000000000')).toBe(false);
  });

  it('scanString מזהה PAN בתוך טקסט', () => {
    const out = scanString(`User card: ${VISA}, expiry 12/25`);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe('pan');
    expect(out[0]!.preview).toBe('424242...4242');
  });

  it('scanObject רקורסיבי', () => {
    const payload = {
      user: { name: 'דני' },
      payment: { cardNumber: VISA, cvv: '123' },
      meta: { trace: `paid with ${MC}` },
    };
    const out = scanObject(payload);
    const kinds = out.map((f) => f.kind);
    expect(kinds).toContain('cardholder_field'); // cardNumber field
    expect(kinds).toContain('cvv');
    expect(kinds).toContain('pan'); // PAN inside trace
  });

  it('assertPciSafe זורק אם יש דליפה', () => {
    expect(() => assertPciSafe({ note: `card ${VISA}` }, 'jwt.claims')).toThrow(/PCI VIOLATION/);
  });

  it('assertPciSafe עובר ב-payload נקי', () => {
    expect(() => assertPciSafe({ token: 'tok_visa_xyz', last4: '4242' })).not.toThrow();
  });

  it('lo מתעלם ממספרים שאינם PAN', () => {
    const out = scanString('phone +972-50-1234567 reference 0000111122223333');
    expect(out).toHaveLength(0);
  });
});
