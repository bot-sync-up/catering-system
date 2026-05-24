import { describe, expect, it } from 'vitest';
import { parseHebrewNumber } from '../src/nlu/HebrewNumberParser.js';

describe('HebrewNumberParser', () => {
  it('מספרים פשוטים זכר/נקבה', () => {
    expect(parseHebrewNumber('שלוש')).toBe(3);
    expect(parseHebrewNumber('שלושה')).toBe(3);
    expect(parseHebrewNumber('שבע')).toBe(7);
  });

  it('עשרות', () => {
    expect(parseHebrewNumber('עשרים')).toBe(20);
    expect(parseHebrewNumber('חמישים')).toBe(50);
  });

  it('מאות', () => {
    expect(parseHebrewNumber('מאה')).toBe(100);
    expect(parseHebrewNumber('שלוש מאות')).toBe(300);
    expect(parseHebrewNumber('חמש מאות')).toBe(500);
  });

  it('צירופים מורכבים', () => {
    expect(parseHebrewNumber('מאתיים חמישים')).toBe(250);
    expect(parseHebrewNumber('שלוש מאות חמישים')).toBe(350);
  });

  it('אלפים', () => {
    expect(parseHebrewNumber('אלף')).toBe(1000);
    expect(parseHebrewNumber('אלפיים')).toBe(2000);
  });

  it('מחזיר null על קלט לא תקין', () => {
    expect(parseHebrewNumber('שלום')).toBe(null);
    expect(parseHebrewNumber('')).toBe(null);
  });

  it('מספר ספרתי עובר ישירות', () => {
    expect(parseHebrewNumber('300')).toBe(300);
    expect(parseHebrewNumber('42')).toBe(42);
  });
});
