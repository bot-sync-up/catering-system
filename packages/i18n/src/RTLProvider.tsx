import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LOCALE_META, RTL_LOCALES, type SupportedLocale } from './types';

interface RTLContextValue {
  dir: 'rtl' | 'ltr';
  locale: SupportedLocale;
  isRTL: boolean;
}

const RTLContext = createContext<RTLContextValue | null>(null);

export interface RTLProviderProps {
  children: React.ReactNode;
  /** override — אחרת נקרא מ-i18next */
  locale?: SupportedLocale;
  /** האם לעדכן <html dir=""> ו-lang */
  applyToDocument?: boolean;
}

/**
 * Provider שמנהל כיוון טקסט (RTL/LTR) לפי שפה פעילה.
 * מעדכן את <html dir> ו-<html lang> אוטומטית.
 */
export function RTLProvider({ children, locale, applyToDocument = true }: RTLProviderProps) {
  const { i18n } = useTranslation();
  const active = (locale ?? (i18n.language as SupportedLocale)) || 'he';

  const value = useMemo<RTLContextValue>(() => {
    const meta = LOCALE_META[active] ?? LOCALE_META.he;
    return { dir: meta.dir, locale: active, isRTL: RTL_LOCALES.has(active) };
  }, [active]);

  useEffect(() => {
    if (!applyToDocument || typeof document === 'undefined') return;
    document.documentElement.setAttribute('dir', value.dir);
    document.documentElement.setAttribute('lang', value.locale);
  }, [applyToDocument, value.dir, value.locale]);

  return <RTLContext.Provider value={value}>{children}</RTLContext.Provider>;
}

export function useRTL(): RTLContextValue {
  const ctx = useContext(RTLContext);
  if (!ctx) {
    // fallback מתון — במקרה שמרכיב משתמש בלי Provider
    return { dir: 'rtl', locale: 'he', isRTL: true };
  }
  return ctx;
}
