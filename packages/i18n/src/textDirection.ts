/**
 * עזרי כיוון טקסט (bidi) עבור עירוב שפות.
 * שימושי במיוחד לעברית עם מספרים/מילים באנגלית באמצע.
 */

import { RTL_LOCALES, type SupportedLocale } from './types';

export type Direction = 'rtl' | 'ltr' | 'auto';

const RTL_RANGES = [
  [0x0590, 0x05ff], // Hebrew
  [0x0600, 0x06ff], // Arabic
  [0x0700, 0x074f], // Syriac
  [0x0750, 0x077f], // Arabic Supplement
  [0xfb1d, 0xfdff], // Hebrew + Arabic presentation
  [0xfe70, 0xfefe], // Arabic Presentation Forms-B
];

/** מזהה האם תו בודד הוא RTL לפי טווחי Unicode */
export function isRTLChar(ch: string): boolean {
  const code = ch.codePointAt(0);
  if (code === undefined) return false;
  return RTL_RANGES.some(([from, to]) => code >= from! && code <= to!);
}

/** מזהה את הכיוון הדומיננטי של טקסט (לפי first strong char) */
export function detectDirection(text: string): Direction {
  if (!text) return 'auto';
  for (const ch of text) {
    if (isRTLChar(ch)) return 'rtl';
    // אותיות לטיניות/קיריליות = LTR
    const code = ch.codePointAt(0)!;
    if ((code >= 0x0041 && code <= 0x024f) || (code >= 0x0400 && code <= 0x04ff)) {
      return 'ltr';
    }
  }
  return 'auto';
}

export function isRTLLocale(locale: SupportedLocale): boolean {
  return RTL_LOCALES.has(locale);
}

/**
 * עוטף טקסט באנגלית/מספר בתוך משפט עברי ב-LRM/RLM כדי למנוע "קפיצות" bidi.
 * דוגמה: bidiIsolate('הזמנה #1234') → 'הזמנה ‪#1234‬'
 */
export function bidiIsolate(text: string, dir: 'ltr' | 'rtl' = 'ltr'): string {
  const ISOLATE_START = dir === 'ltr' ? '⁦' : '⁧'; // LRI / RLI
  const ISOLATE_END = '⁩'; // PDI
  return ISOLATE_START + text + ISOLATE_END;
}

/** עזר ל-React: מחזיר { dir, lang } props לפי locale */
export function dirAttrs(locale: SupportedLocale): { dir: 'rtl' | 'ltr'; lang: string } {
  return { dir: isRTLLocale(locale) ? 'rtl' : 'ltr', lang: locale };
}
