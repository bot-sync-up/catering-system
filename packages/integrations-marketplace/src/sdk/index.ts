/**
 * Sync Up Plugin SDK — נקודת כניסה למפתחים חיצוניים.
 *
 * שימוש:
 *   import { definePlugin, helpers } from '@syncup/integrations-marketplace/sdk';
 *
 *   export default definePlugin({
 *     manifest: { ... },
 *     async install(ctx, config) { ... },
 *     async uninstall(ctx) { ... },
 *     async healthCheck(ctx) { ... },
 *   });
 */

export type { IPlugin, PluginManifest, PluginCategory, PluginAuthType, PluginAction, PluginHealth, ConfigField } from '../core/IPlugin';
export type { PluginContext, PluginLogger, PluginStorage, PluginSecrets, PluginHttpClient } from '../core/PluginContext';

import type { IPlugin } from '../core/IPlugin';

/**
 * Helper לטיפוסיות מלאה בעת הגדרת פלאגין.
 * אינו עושה שום דבר ב-runtime — רק מבטיח type checking.
 */
export function definePlugin<T extends IPlugin>(plugin: T): T {
  // וולידציות בסיסיות בזמן load
  if (!plugin.manifest?.id) {
    throw new Error('Plugin must declare manifest.id');
  }
  if (!plugin.install || !plugin.uninstall || !plugin.healthCheck) {
    throw new Error('Plugin must implement install, uninstall, healthCheck');
  }
  return plugin;
}

/**
 * עזרי שימוש נפוצים לפלאגינים.
 */
export const helpers = {
  /** המתנה לזמן קצוב */
  sleep: (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)),

  /** retry עם exponential backoff */
  async retry<T>(fn: () => Promise<T>, attempts = 3, baseMs = 500): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        if (i < attempts - 1) {
          await new Promise(r => setTimeout(r, baseMs * Math.pow(2, i)));
        }
      }
    }
    throw lastErr;
  },

  /** המרה של תאריך לפורמט ISO ישראלי */
  toIsraeliDate(d: Date): string {
    return d.toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' });
  },

  /** ולידציה של ת"ז ישראלית */
  validateIsraeliId(id: string): boolean {
    const clean = id.replace(/\D/g, '').padStart(9, '0');
    if (clean.length !== 9) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let digit = parseInt(clean[i], 10) * ((i % 2) + 1);
      if (digit > 9) digit -= 9;
      sum += digit;
    }
    return sum % 10 === 0;
  },

  /** ולידציה של ח.פ. ישראלי (9 ספרות) */
  validateBusinessId(id: string): boolean {
    return /^\d{9}$/.test(id.replace(/\D/g, ''));
  },
};
