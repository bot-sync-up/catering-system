import type { SupportedLocale } from './types';

const LOCALE_BCP47: Record<SupportedLocale, string> = {
  he: 'he-IL',
  en: 'en-US',
  ar: 'ar-EG',
  ru: 'ru-RU',
  am: 'am-ET',
};

export function formatNumber(
  value: number,
  locale: SupportedLocale,
  options: Intl.NumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(LOCALE_BCP47[locale], options).format(value);
}

/** אחוז — לדוגמה 0.15 → "15%" */
export function formatPercent(
  value: number,
  locale: SupportedLocale,
  fractionDigits = 0,
): string {
  return formatNumber(value, locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** מספר קומפקטי — 12500 → "12.5K" / "12.5 אלף" */
export function formatCompactNumber(value: number, locale: SupportedLocale): string {
  return formatNumber(value, locale, { notation: 'compact', maximumFractionDigits: 1 });
}

export function getBCP47(locale: SupportedLocale): string {
  return LOCALE_BCP47[locale];
}
