/**
 * PluginContext — ההקשר שניתן לכל פלאגין בזמן ריצה.
 * מספק גישה ל-secrets, logger, אחסון לקוח-ספציפי, ולוגים מקומיים.
 */

export interface PluginLogger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

export interface PluginStorage {
  /** קריאה של ערך מהאחסון של הפלאגין */
  get<T = unknown>(key: string): Promise<T | null>;
  /** שמירה לאחסון של הפלאגין */
  set<T = unknown>(key: string, value: T): Promise<void>;
  /** מחיקה */
  delete(key: string): Promise<void>;
  /** רישום מפתחות בקידומת */
  list(prefix?: string): Promise<string[]>;
}

export interface PluginSecrets {
  /** קריאת secret מוצפן (גישה רק עם הרשאה במניפסט) */
  read(key: string): Promise<string | null>;
  /** כתיבת secret מוצפן */
  write(key: string, value: string): Promise<void>;
}

export interface PluginEventBus {
  emit(eventType: string, payload: unknown): Promise<void>;
  on(eventType: string, handler: (payload: unknown) => void | Promise<void>): void;
}

export interface PluginHttpClient {
  request<T = unknown>(opts: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeoutMs?: number;
  }): Promise<{ status: number; data: T; headers: Record<string, string> }>;
}

export interface PluginContext {
  /** מזהה הארגון/לקוח שעבורו רץ הפלאגין */
  organizationId: string;
  /** מזהה ההתקנה הספציפית */
  installationId: string;
  /** Locale עברית כברירת מחדל */
  locale: 'he' | 'en';
  /** Timezone — ברירת מחדל Asia/Jerusalem */
  timezone: string;

  logger: PluginLogger;
  storage: PluginStorage;
  secrets: PluginSecrets;
  events: PluginEventBus;
  http: PluginHttpClient;
}
