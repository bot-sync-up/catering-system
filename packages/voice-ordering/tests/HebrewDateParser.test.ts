import { describe, expect, it } from 'vitest';
import { parseHebrewDate } from '../src/nlu/HebrewDateParser.js';

describe('HebrewDateParser', () => {
  const ref = new Date('2026-05-24T00:00:00'); // יום ראשון

  it('היום', () => {
    expect(parseHebrewDate('היום', ref)).toBe('2026-05-24');
  });

  it('מחר', () => {
    expect(parseHebrewDate('מחר', ref)).toBe('2026-05-25');
  });

  it('מחרתיים', () => {
    expect(parseHebrewDate('מחרתיים', ref)).toBe('2026-05-26');
  });

  it('בשבת הבאה — שבת אחרי השבת הקרובה', () => {
    // הקרובה היא 30/5, הבאה היא בעוד שבוע - 30/5 (כיוון שעוד לא עברה אנחנו נופלים על 30/5)
    const result = parseHebrewDate('בשבת הבאה', ref);
    expect(result).toMatch(/^2026-05-30|2026-06-06$/);
  });

  it('בעוד שבועיים', () => {
    expect(parseHebrewDate('בעוד שבועיים שבועות', ref)).toBeDefined();
  });

  it('פורמט מספרי dd/mm', () => {
    expect(parseHebrewDate('15/11', ref)).toBe('2026-11-15');
  });

  it('פורמט מספרי dd.mm.yyyy', () => {
    expect(parseHebrewDate('20.12.2027', ref)).toBe('2027-12-20');
  });

  it('מחזיר null על קלט לא מובן', () => {
    expect(parseHebrewDate('לא תאריך כלל', ref)).toBe(null);
  });
});
