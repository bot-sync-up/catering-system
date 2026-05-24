import { describe, expect, it } from 'vitest';
import { detectLanguage, normalizeLocale, parseAcceptLanguage } from '../src/detectLanguage';

describe('detectLanguage', () => {
  it('userPreference קודמת לכל', () => {
    expect(detectLanguage({
      userPreference: 'ar',
      browserLanguages: ['en-US'],
      countryCode: 'RU',
    })).toBe('ar');
  });

  it('browser → קודם משתמש לא הגדיר', () => {
    expect(detectLanguage({ browserLanguages: ['en-US', 'fr'] })).toBe('en');
  });

  it('GeoIP IL → he', () => {
    expect(detectLanguage({ countryCode: 'IL' })).toBe('he');
  });

  it('GeoIP RU → ru', () => {
    expect(detectLanguage({ countryCode: 'RU' })).toBe('ru');
  });

  it('GeoIP ET → am', () => {
    expect(detectLanguage({ countryCode: 'ET' })).toBe('am');
  });

  it('fallback ל-he כברירת מחדל', () => {
    expect(detectLanguage({})).toBe('he');
  });

  it('שפה לא נתמכת בדפדפן → ממשיך לבא בתור', () => {
    expect(detectLanguage({
      browserLanguages: ['fr-FR', 'de', 'en'],
      countryCode: 'IL',
    })).toBe('en');
  });
});

describe('normalizeLocale', () => {
  it('he-IL → he', () => expect(normalizeLocale('he-IL')).toBe('he'));
  it('en_US → en', () => expect(normalizeLocale('en_US')).toBe('en'));
  it('zh-CN → null (לא נתמך)', () => expect(normalizeLocale('zh-CN')).toBeNull());
  it('null → null', () => expect(normalizeLocale(null)).toBeNull());
});

describe('parseAcceptLanguage', () => {
  it('ממיין לפי q', () => {
    expect(parseAcceptLanguage('en;q=0.9, he;q=1.0, ar;q=0.5')).toEqual(['he', 'en', 'ar']);
  });
  it('header ריק → []', () => {
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage('')).toEqual([]);
  });
});
