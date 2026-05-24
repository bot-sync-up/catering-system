import { describe, expect, it } from 'vitest';
import { getPluralCategory, pluralize, pluralSuffixes } from '../src/pluralizer';

describe('pluralizer — כללי ריבוי לפי שפה', () => {
  describe('רוסית — one / few / many / other', () => {
    it('1, 21, 31 → one', () => {
      expect(getPluralCategory(1, 'ru')).toBe('one');
      expect(getPluralCategory(21, 'ru')).toBe('one');
      expect(getPluralCategory(31, 'ru')).toBe('one');
    });
    it('2-4, 22-24 → few', () => {
      expect(getPluralCategory(2, 'ru')).toBe('few');
      expect(getPluralCategory(3, 'ru')).toBe('few');
      expect(getPluralCategory(4, 'ru')).toBe('few');
      expect(getPluralCategory(22, 'ru')).toBe('few');
    });
    it('0, 5-20, 25-30 → many', () => {
      expect(getPluralCategory(0, 'ru')).toBe('many');
      expect(getPluralCategory(5, 'ru')).toBe('many');
      expect(getPluralCategory(11, 'ru')).toBe('many');
      expect(getPluralCategory(15, 'ru')).toBe('many');
      expect(getPluralCategory(25, 'ru')).toBe('many');
    });
    it('pluralize שלם — заказ/заказа/заказов', () => {
      const forms = {
        one: '{{count}} заказ',
        few: '{{count}} заказа',
        many: '{{count}} заказов',
        other: '{{count}} заказа',
      };
      expect(pluralize(1, 'ru', forms)).toBe('1 заказ');
      expect(pluralize(3, 'ru', forms)).toBe('3 заказа');
      expect(pluralize(7, 'ru', forms)).toBe('7 заказов');
      expect(pluralize(21, 'ru', forms)).toBe('21 заказ');
    });
  });

  describe('עברית — one / two / many / other', () => {
    it('1 → one, 2 → two', () => {
      expect(getPluralCategory(1, 'he')).toBe('one');
      expect(getPluralCategory(2, 'he')).toBe('two');
    });
    it('pluralize — פריט/שני פריטים/פריטים', () => {
      const forms = {
        one: 'פריט אחד',
        two: 'שני פריטים',
        other: '{{count}} פריטים',
      };
      expect(pluralize(1, 'he', forms)).toBe('פריט אחד');
      expect(pluralize(2, 'he', forms)).toBe('שני פריטים');
      expect(pluralize(5, 'he', forms)).toBe('5 פריטים');
    });
  });

  describe('ערבית — zero/one/two/few/many/other', () => {
    it('0 → zero, 1 → one, 2 → two', () => {
      expect(getPluralCategory(0, 'ar')).toBe('zero');
      expect(getPluralCategory(1, 'ar')).toBe('one');
      expect(getPluralCategory(2, 'ar')).toBe('two');
    });
    it('3 → few, 11 → many', () => {
      expect(getPluralCategory(3, 'ar')).toBe('few');
      expect(getPluralCategory(11, 'ar')).toBe('many');
    });
  });

  describe('אנגלית ואמהרית — one / other', () => {
    it('1 → one, 5 → other', () => {
      expect(getPluralCategory(1, 'en')).toBe('one');
      expect(getPluralCategory(5, 'en')).toBe('other');
      expect(getPluralCategory(1, 'am')).toBe('one');
      expect(getPluralCategory(5, 'am')).toBe('other');
    });
  });

  describe('pluralSuffixes — קטגוריות פעילות לכל שפה', () => {
    it('ru = [one, few, many, other]', () => {
      expect(pluralSuffixes('ru')).toEqual(['one', 'few', 'many', 'other']);
    });
    it('en = [one, other]', () => {
      expect(pluralSuffixes('en')).toEqual(['one', 'other']);
    });
    it('ar — 6 קטגוריות', () => {
      expect(pluralSuffixes('ar')).toHaveLength(6);
    });
  });
});
