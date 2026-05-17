/**
 * helpers.ts - עזרים לבדיקות adapters (mock EventBus + mock Redis).
 */

import { vi } from 'vitest';
import type { EventBus } from '@catering/event-bus';

export function makeMockBus(): EventBus & {
  __published: Array<{ name: string; payload: unknown; options?: unknown }>;
} {
  const published: Array<{ name: string; payload: unknown; options?: unknown }> = [];
  const bus = {
    publish: vi.fn(async (name: string, payload: unknown, options?: unknown) => {
      published.push({ name, payload, options });
      return `published-${name}-${published.length}`;
    }),
    subscribe: vi.fn(),
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
  } as unknown as EventBus & {
    __published: typeof published;
  };
  (bus as { __published: typeof published }).__published = published;
  return bus;
}

export function makeMockRedis() {
  const store = new Map<string, string>();
  return {
    exists: vi.fn(async (key: string) => (store.has(key) ? 1 : 0)),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return 'OK';
    }),
    lpush: vi.fn(async () => 1),
    quit: vi.fn(async () => 'OK'),
    __store: store,
  };
}
