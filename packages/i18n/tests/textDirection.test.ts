import { describe, expect, it } from 'vitest';
import { detectDirection, isRTLChar, isRTLLocale, bidiIsolate, dirAttrs } from '../src/textDirection';

describe('textDirection', () => {
  it('isRTLChar — תווים עבריים', () => {
    expect(isRTLChar('ש')).toBe(true);
    expect(isRTLChar('א')).toBe(true);
  });
  it('isRTLChar — תווים ערביים', () => {
    expect(isRTLChar('ع')).toBe(true);
  });
  it('isRTLChar — לטיני = false', () => {
    expect(isRTLChar('a')).toBe(false);
    expect(isRTLChar('1')).toBe(false);
  });

  it('detectDirection — כיוון דומיננטי', () => {
    expect(detectDirection('שלום עולם')).toBe('rtl');
    expect(detectDirection('Hello World')).toBe('ltr');
    expect(detectDirection('مرحبا')).toBe('rtl');
    expect(detectDirection('123 שלום')).toBe('rtl'); // אותיות first strong חזקות
    expect(detectDirection('')).toBe('auto');
  });

  it('isRTLLocale', () => {
    expect(isRTLLocale('he')).toBe(true);
    expect(isRTLLocale('ar')).toBe(true);
    expect(isRTLLocale('en')).toBe(false);
    expect(isRTLLocale('ru')).toBe(false);
    expect(isRTLLocale('am')).toBe(false);
  });

  it('bidiIsolate — עוטף בLRI/PDI', () => {
    const out = bidiIsolate('Order #1234', 'ltr');
    expect(out.startsWith('⁦')).toBe(true); // LRI
    expect(out.endsWith('⁩')).toBe(true);   // PDI
  });

  it('dirAttrs — props מוכנים ל-React', () => {
    expect(dirAttrs('he')).toEqual({ dir: 'rtl', lang: 'he' });
    expect(dirAttrs('en')).toEqual({ dir: 'ltr', lang: 'en' });
  });
});
