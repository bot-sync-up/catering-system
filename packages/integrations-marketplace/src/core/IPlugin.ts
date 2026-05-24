/**
 * IPlugin — ממשק יסוד של כל פלאגין במרקטפלייס.
 *
 * כל פלאגין מממש את הממשק הזה כדי להירשם ב-PluginRegistry
 * ולקבל הקשר ריצה (PluginContext) בזמן ההפעלה.
 */

import type { PluginContext } from './PluginContext';

export type PluginCategory =
  | 'calendar'
  | 'accounting'
  | 'payment'
  | 'bi'
  | 'marketing'
  | 'operations'
  | 'communication'
  | 'storage';

export type PluginAuthType = 'oauth2' | 'api-key' | 'basic' | 'webhook' | 'none';

export interface PluginManifest {
  /** מזהה ייחודי קבוע: provider-name (לדוגמה google-calendar) */
  id: string;
  /** שם תצוגה לפלאגין */
  name: string;
  /** שם בעברית להצגה ל-UI */
  nameHe: string;
  /** קטגוריה */
  category: PluginCategory;
  /** גרסת סמנטיק */
  version: string;
  /** שם הספק */
  vendor: string;
  /** תיאור קצר באנגלית */
  description: string;
  /** תיאור קצר בעברית */
  descriptionHe: string;
  /** סוג אימות */
  authType: PluginAuthType;
  /** דורש webhook נכנס מהספק */
  requiresWebhook?: boolean;
  /** אייקון URL/Base64 */
  icon?: string;
  /** רשימת הרשאות שהפלאגין דורש (least-privilege) */
  permissions: string[];
  /** scopes ל-OAuth (אם רלוונטי) */
  scopes?: string[];
  /** הגדרות נוספות שהמשתמש צריך להזין */
  configSchema?: Record<string, ConfigField>;
}

export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'select' | 'secret';
  label: string;
  labelHe: string;
  required: boolean;
  default?: unknown;
  options?: Array<{ value: string; label: string; labelHe: string }>;
  description?: string;
}

export interface PluginHookEvent<T = unknown> {
  type: string;
  payload: T;
  occurredAt: Date;
  source: string;
}

/**
 * ממשק הליבה שכל פלאגין חייב לממש.
 */
export interface IPlugin {
  manifest: PluginManifest;

  /** מופעל פעם אחת בעת התקנה בארגון/לקוח */
  install(ctx: PluginContext, config: Record<string, unknown>): Promise<void>;

  /** מופעל לפני הסרה — ניקוי משאבים, ביטול webhooks וכד' */
  uninstall(ctx: PluginContext): Promise<void>;

  /** בדיקת מצב חי — מחזיר ok/degraded/down */
  healthCheck(ctx: PluginContext): Promise<PluginHealth>;

  /** ראוטר/handler ל-webhook נכנס (רק אם requiresWebhook) */
  handleWebhook?(ctx: PluginContext, event: PluginHookEvent): Promise<void>;

  /** מציע פעולות שניתן לקרוא להן ב-runtime (RPC) */
  actions?: Record<string, PluginAction>;
}

export interface PluginAction {
  name: string;
  description: string;
  descriptionHe: string;
  execute(ctx: PluginContext, params: Record<string, unknown>): Promise<unknown>;
}

export interface PluginHealth {
  status: 'ok' | 'degraded' | 'down';
  message?: string;
  checkedAt: Date;
  latencyMs?: number;
}
