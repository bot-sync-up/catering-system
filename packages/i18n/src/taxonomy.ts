/**
 * טקסונומיית כשרות וקטגוריות מזון יהודיות.
 * שימוש: סינון תפריט, תיוג ב-CRM/orders, אזהרות חצי-יום שישי.
 */

export type KashrutKind = 'meat' | 'dairy' | 'pareve';
export type KashrutLevel = 'regular' | 'mehadrin' | 'badatz' | 'glatt' | 'chalav-yisrael' | 'yoshen';

export interface KashrutKindMeta {
  id: KashrutKind;
  he: string;
  en: string;
  ar: string;
  ru: string;
  symbol: string;
}

export const KASHRUT_KINDS: Record<KashrutKind, KashrutKindMeta> = {
  meat:   { id: 'meat',   he: 'בשרי',  en: 'Meat',   ar: 'لحم',         ru: 'Мясное',    symbol: '🥩' },
  dairy:  { id: 'dairy',  he: 'חלבי',  en: 'Dairy',  ar: 'حليبي',       ru: 'Молочное',  symbol: '🥛' },
  pareve: { id: 'pareve', he: 'פרווה', en: 'Pareve', ar: 'بارفي',       ru: 'Парве',     symbol: '🌿' },
};

export interface KashrutLevelMeta {
  id: KashrutLevel;
  he: string;
  en: string;
  ar: string;
  ru: string;
  /** רמת חומרה — ככל שגבוה יותר, כך מחמיר יותר */
  strictness: number;
}

export const KASHRUT_LEVELS: Record<KashrutLevel, KashrutLevelMeta> = {
  'regular':         { id: 'regular',         he: 'כשר',           en: 'Kosher',                ar: 'كوشير',                ru: 'Кошер',                strictness: 1 },
  'mehadrin':        { id: 'mehadrin',        he: 'מהדרין',        en: 'Mehadrin',              ar: 'مهدرين',              ru: 'Мехадрин',             strictness: 3 },
  'badatz':          { id: 'badatz',          he: 'בד"ץ',          en: 'Badatz',                ar: 'بدتس',                ru: 'Бадац',                strictness: 5 },
  'glatt':           { id: 'glatt',           he: 'גלאט',          en: 'Glatt',                 ar: 'غلات',                ru: 'Глат',                 strictness: 4 },
  'chalav-yisrael':  { id: 'chalav-yisrael',  he: 'חלב ישראל',     en: 'Chalav Yisrael',        ar: 'حليب يهودي',         ru: 'Халав Исраэль',        strictness: 3 },
  'yoshen':          { id: 'yoshen',          he: 'ישן (ללא חדש)', en: 'Yoshen (no Chadash)',   ar: 'يوشين',               ru: 'Ёшен',                 strictness: 4 },
};

/** האם שתי קטגוריות יכולות להופיע באותה מנה? בשרי + חלבי = לא! */
export function areCompatibleKinds(a: KashrutKind, b: KashrutKind): boolean {
  if (a === b) return true;
  if (a === 'pareve' || b === 'pareve') return true;
  // meat + dairy → אסור
  return false;
}

/** האם רמת הכשרות `provided` עונה על דרישת `required`? */
export function meetsKashrutLevel(provided: KashrutLevel, required: KashrutLevel): boolean {
  return KASHRUT_LEVELS[provided].strictness >= KASHRUT_LEVELS[required].strictness;
}

export function kashrutKindLabel(kind: KashrutKind, locale: 'he' | 'en' | 'ar' | 'ru'): string {
  return KASHRUT_KINDS[kind][locale];
}

export function kashrutLevelLabel(level: KashrutLevel, locale: 'he' | 'en' | 'ar' | 'ru'): string {
  return KASHRUT_LEVELS[level][locale];
}
