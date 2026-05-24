import { describe, it, expect } from 'vitest';
import {
  isHebrew,
  stripNikud,
  formatIsraeliPhone,
  isValidIsraeliId,
  isValidBusinessId,
  isValidIsraeliPhone,
  formatILS,
} from '../src/utils/hebrew';

describe('כלי עברית', () => {
  it('מזהה טקסט עברי', () => {
    expect(isHebrew('שלום')).toBe(true);
    expect(isHebrew('hello')).toBe(false);
  });

  it('מסיר ניקוד', () => {
    expect(stripNikud('שָׁלוֹם')).toBe('שלום');
  });

  it('מעצב טלפון נייד ישראלי', () => {
    expect(formatIsraeliPhone('0501234567')).toBe('050-123-4567');
  });

  it('מעצב טלפון קווי ישראלי', () => {
    expect(formatIsraeliPhone('021234567')).toBe('02-123-4567');
  });

  it('מוודא טלפון ישראלי תקין', () => {
    expect(isValidIsraeliPhone('0501234567')).toBe(true);
    expect(isValidIsraeliPhone('021234567')).toBe(true);
    expect(isValidIsraeliPhone('1234')).toBe(false);
  });

  it('בודק תעודת זהות לפי לוהן', () => {
    // ת.ז. תקפה ידועה (לבדיקה)
    expect(isValidIsraeliId('000000018')).toBe(true);
    expect(isValidIsraeliId('123456782')).toBe(true);
    expect(isValidIsraeliId('123456789')).toBe(false);
  });

  it('בודק ח.פ', () => {
    expect(isValidBusinessId('000000018')).toBe(true);
    expect(isValidBusinessId('123456789')).toBe(false);
  });

  it('מעצב סכום בשקלים', () => {
    const out = formatILS(1234.5);
    expect(out).toMatch(/1,234\.50/);
    expect(out).toMatch(/₪/);
  });
});
