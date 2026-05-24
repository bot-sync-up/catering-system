/**
 * תמיכת RTL ב-CSS — שימוש ב-stylis-plugin-rtl כדי להפוך אוטומטית
 * margin-left ↔ margin-right, float, text-align וכו'.
 *
 * דוגמת שימוש עם emotion / styled-components:
 *   import { CacheProvider } from '@emotion/react';
 *   import { createRTLCache } from '@app/i18n';
 *   const cache = createRTLCache('rtl');
 *   <CacheProvider value={cache}>…</CacheProvider>
 */

import { compile, serialize, stringify, middleware } from 'stylis';
// @ts-expect-error — אין types רשמיים ל-stylis-plugin-rtl
import stylisRTL from 'stylis-plugin-rtl';

/**
 * מהפך מחרוזת CSS גולמית ל-RTL.
 *   flipCSS('.box { margin-left: 8px; }') → '.box { margin-right: 8px; }'
 */
export function flipCSS(css: string): string {
  const compiled = compile(css);
  return serialize(compiled, middleware([stylisRTL, stringify]));
}

/**
 * עוטף ערך CSS כך שיהפך RTL רק אם isRTL=true.
 */
export function maybeFlipCSS(css: string, isRTL: boolean): string {
  return isRTL ? flipCSS(css) : css;
}

/**
 * Helper לבחירת ערכים לפי כיוון. דוגמה:
 *   marginInline(isRTL, '16px', '0')   // start, end
 */
export function dirValue<T>(isRTL: boolean, start: T, end: T): { start: T; end: T } {
  return isRTL ? { start: end, end: start } : { start, end };
}

/**
 * הפיכת `left`/`right` בלוגיקת קוד (לא CSS) — שימושי לפיזיקליים כמו עכבר.
 */
export function flipSide(side: 'left' | 'right', isRTL: boolean): 'left' | 'right' {
  if (!isRTL) return side;
  return side === 'left' ? 'right' : 'left';
}
