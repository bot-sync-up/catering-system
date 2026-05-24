import type { SupportedLocale } from './types';

/**
 * כללי ריבוי בשפות שלנו:
 * - he: one (1) / two (2) / other — וגם many ב-Intl, אבל ברוב הקייסים one/other מספיק
 * - en: one (1) / other
 * - ar: zero / one / two / few (3-10) / many (11-99) / other
 * - ru: one (1, 21, 31...) / few (2-4, 22-24...) / many (0, 5-20, 25-30...) / other (שברים)
 * - am: one / other
 *
 * אנחנו מסתמכים על Intl.PluralRules עבור הקטגוריה, ועוטפים בבחירת מחרוזת.
 */

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

const LOCALE_BCP47: Record<SupportedLocale, string> = {
  he: 'he-IL',
  en: 'en-US',
  ar: 'ar-EG',
  ru: 'ru-RU',
  am: 'am-ET',
};

const cache = new Map<string, Intl.PluralRules>();

function getRules(locale: SupportedLocale, type: Intl.PluralRuleType = 'cardinal'): Intl.PluralRules {
  const key = `${locale}:${type}`;
  let r = cache.get(key);
  if (!r) {
    r = new Intl.PluralRules(LOCALE_BCP47[locale], { type });
    cache.set(key, r);
  }
  return r;
}

export function getPluralCategory(
  count: number,
  locale: SupportedLocale,
  type: Intl.PluralRuleType = 'cardinal',
): PluralCategory {
  return getRules(locale, type).select(count) as PluralCategory;
}

export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/**
 * pluralize(count, locale, forms) — בוחר את הצורה הנכונה ומחליף {{count}}.
 * דוגמה ברוסית:
 *   pluralize(5, 'ru', { one: '{{count}} заказ', few: '{{count}} заказа', many: '{{count}} заказов', other: '{{count}} заказа' })
 *   → "5 заказов"
 */
export function pluralize(count: number, locale: SupportedLocale, forms: PluralForms): string {
  const cat = getPluralCategory(count, locale);
  const tmpl =
    forms[cat] ??
    forms.other ??
    String(count);
  return tmpl.replace(/\{\{\s*count\s*\}\}/g, String(count));
}

/** עזר לקטגוריות שמופיעות בשפה — שימושי לבדיקות קומפלטיות של מפתחות i18next */
export function pluralSuffixes(locale: SupportedLocale): PluralCategory[] {
  // לפי CLDR — אלו הקטגוריות שאי-פעם מופעלות בשפה
  const sets: Record<SupportedLocale, PluralCategory[]> = {
    he: ['one', 'two', 'many', 'other'],
    en: ['one', 'other'],
    ar: ['zero', 'one', 'two', 'few', 'many', 'other'],
    ru: ['one', 'few', 'many', 'other'],
    am: ['one', 'other'],
  };
  return sets[locale];
}
