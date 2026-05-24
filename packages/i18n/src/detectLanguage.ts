import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from './types';

/** מיפוי קודי מדינה (ISO 3166) → שפה מועדפת */
const COUNTRY_TO_LOCALE: Record<string, SupportedLocale> = {
  IL: 'he',
  PS: 'ar', SA: 'ar', AE: 'ar', EG: 'ar', JO: 'ar', LB: 'ar', SY: 'ar', IQ: 'ar',
  RU: 'ru', BY: 'ru', KZ: 'ru', UA: 'ru', UZ: 'ru',
  ET: 'am', ER: 'am',
  US: 'en', GB: 'en', AU: 'en', CA: 'en', IE: 'en', NZ: 'en',
};

export interface DetectOptions {
  /** העדפת משתמש שנשמרה (DB / cookie) — קודמת לכל דבר אחר */
  userPreference?: string | null;
  /** Accept-Language header או navigator.language */
  browserLanguages?: readonly string[];
  /** קוד מדינה ISO 3166 alpha-2 (GeoIP) */
  countryCode?: string | null;
  /** ברירת מחדל בולעת אם כלום לא תפס */
  fallback?: SupportedLocale;
}

/** נרמול קוד שפה ('he-IL' → 'he', 'en_US' → 'en') */
export function normalizeLocale(input: string | null | undefined): SupportedLocale | null {
  if (!input) return null;
  const base = input.toLowerCase().split(/[-_]/)[0];
  if (!base) return null;
  if ((SUPPORTED_LOCALES as readonly string[]).includes(base)) {
    return base as SupportedLocale;
  }
  return null;
}

/**
 * מזהה שפה לפי סדר עדיפויות:
 * 1. העדפת משתמש (אם תקפה)
 * 2. שפת הדפדפן הראשונה הנתמכת
 * 3. שפה לפי מדינת ה-IP
 * 4. fallback (ברירת מחדל: he)
 */
export function detectLanguage(opts: DetectOptions = {}): SupportedLocale {
  const fallback = opts.fallback ?? DEFAULT_LOCALE;

  const pref = normalizeLocale(opts.userPreference ?? null);
  if (pref) return pref;

  if (opts.browserLanguages) {
    for (const lang of opts.browserLanguages) {
      const norm = normalizeLocale(lang);
      if (norm) return norm;
    }
  }

  if (opts.countryCode) {
    const fromCountry = COUNTRY_TO_LOCALE[opts.countryCode.toUpperCase()];
    if (fromCountry) return fromCountry;
  }

  return fallback;
}

/** איסוף שפות הדפדפן ב-runtime (browser only) */
export function getBrowserLanguages(): string[] {
  if (typeof navigator === 'undefined') return [];
  const arr = navigator.languages ?? (navigator.language ? [navigator.language] : []);
  return Array.from(arr);
}

/** איסוף שפות מ-Accept-Language header (שרת) */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=');
      return { lang: lang?.trim() ?? '', q: q ? parseFloat(q) : 1.0 };
    })
    .filter((x) => x.lang)
    .sort((a, b) => b.q - a.q)
    .map((x) => x.lang);
}
