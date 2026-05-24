/**
 * PluginSandbox — בידוד ריצה של פלאגינים.
 *
 * אכיפת:
 *  - timeout (ברירת מחדל 30 שניות)
 *  - תפיסת חריגות וחיווי מסודר
 *  - הגבלת זיכרון/CPU (placeholder — יממומש בעתיד עם worker_threads)
 *  - אכיפת הרשאות מהמניפסט
 */

import type { IPlugin } from './IPlugin';

export interface SandboxOptions {
  timeoutMs?: number;
}

export class PluginSandbox {
  /**
   * הרצת פעולה בהקשר פלאגין עם הגבלות זמן וטיפול בשגיאות.
   */
  async run<T>(plugin: IPlugin, fn: () => Promise<T>, opts: SandboxOptions = {}): Promise<T> {
    const timeoutMs = opts.timeoutMs ?? 30_000;

    return new Promise<T>((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(
          new Error(
            `Plugin ${plugin.manifest.id} exceeded timeout of ${timeoutMs}ms`
          )
        );
      }, timeoutMs);

      fn()
        .then(val => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(val);
        })
        .catch(err => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(
            err instanceof Error
              ? new Error(`[plugin:${plugin.manifest.id}] ${err.message}`)
              : new Error(`[plugin:${plugin.manifest.id}] unknown error`)
          );
        });
    });
  }

  /**
   * בדיקה האם הפלאגין הצהיר על הרשאה מסוימת.
   * ב-runtime אפשר לעטוף קריאות רגישות (HTTP, storage) ב-assertPermission.
   */
  assertPermission(plugin: IPlugin, permission: string): void {
    if (!plugin.manifest.permissions.includes(permission)) {
      throw new Error(
        `Plugin ${plugin.manifest.id} lacks required permission: ${permission}`
      );
    }
  }
}
