export const SUPPORTED_LOCALES = ['he', 'en', 'ar', 'ru', 'am'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'he';

export const RTL_LOCALES: ReadonlySet<SupportedLocale> = new Set(['he', 'ar']);

export const NAMESPACES = [
  'common',
  'orders',
  'kitchen',
  'crm',
  'finance',
  'mobile',
  'emails',
  'errors',
  'validation',
] as const;
export type Namespace = (typeof NAMESPACES)[number];

export interface LocaleMeta {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  dir: 'rtl' | 'ltr';
  flag: string;
}

export const LOCALE_META: Record<SupportedLocale, LocaleMeta> = {
  he: { code: 'he', name: 'Hebrew', nativeName: 'עברית', dir: 'rtl', flag: '🇮🇱' },
  en: { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', flag: '🇬🇧' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr', flag: '🇷🇺' },
  am: { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', dir: 'ltr', flag: '🇪🇹' },
};
