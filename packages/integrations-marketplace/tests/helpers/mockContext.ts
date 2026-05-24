/**
 * mockContext — בונה PluginContext דמה לטסטים, ללא רשת אמיתית.
 */

import type { PluginContext } from '../../src/core/PluginContext';

export interface MockContextOptions {
  httpResponses?: Array<{ status: number; data?: unknown }>;
}

export function mockContext(opts: MockContextOptions = {}): PluginContext & {
  _storage: Map<string, unknown>;
  _secrets: Map<string, string>;
  _events: Array<{ type: string; payload: unknown }>;
  _httpCalls: Array<{ method: string; url: string }>;
} {
  const storage = new Map<string, unknown>();
  const secrets = new Map<string, string>();
  const events: Array<{ type: string; payload: unknown }> = [];
  const httpCalls: Array<{ method: string; url: string }> = [];
  const queue = [...(opts.httpResponses ?? [])];

  return {
    organizationId: 'org_test',
    installationId: 'inst_test',
    locale: 'he',
    timezone: 'Asia/Jerusalem',

    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
    storage: {
      async get(k) {
        return (storage.get(k) ?? null) as never;
      },
      async set(k, v) {
        storage.set(k, v);
      },
      async delete(k) {
        storage.delete(k);
      },
      async list(prefix) {
        return Array.from(storage.keys()).filter(k => !prefix || k.startsWith(prefix));
      },
    },
    secrets: {
      async read(k) {
        return secrets.get(k) ?? null;
      },
      async write(k, v) {
        secrets.set(k, v);
      },
    },
    events: {
      async emit(type, payload) {
        events.push({ type, payload });
      },
      on() {},
    },
    http: {
      async request(opts) {
        httpCalls.push({ method: opts.method, url: opts.url });
        const next = queue.shift() ?? { status: 200, data: { ok: true } };
        return { status: next.status, data: next.data as never, headers: {} };
      },
    },

    _storage: storage,
    _secrets: secrets,
    _events: events,
    _httpCalls: httpCalls,
  };
}
