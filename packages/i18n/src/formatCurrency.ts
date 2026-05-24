import type { SupportedLocale } from './types';
import { getBCP47 } from './formatNumber';

export type CurrencyCode = 'ILS' | 'USD' | 'EUR' | 'GBP' | 'RUB' | 'ETB' | 'AED' | 'SAR';

/** מטבע ברירת מחדל לפי שפה */
export const DEFAULT_CURRENCY: Record<SupportedLocale, CurrencyCode> = {
  he: 'ILS',
  en: 'USD',
  ar: 'AED',
  ru: 'RUB',
  am: 'ETB',
};

export function formatCurrency(
  amount: number,
  locale: SupportedLocale,
  currency: CurrencyCode = DEFAULT_CURRENCY[locale],
  options: Intl.NumberFormatOptions = {},
): string {
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat(getBCP47(locale), {
    style: 'currency',
    currency,
    ...options,
  }).format(amount);
}

/** מציג סכום כשרק הסימול חשוב — "₪1,234" ללא חלקי אגורות */
export function formatPrice(amount: number, locale: SupportedLocale, currency?: CurrencyCode): string {
  return formatCurrency(amount, locale, currency, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
