/**
 * Test doubles - fake EventBus + fake clients עבור integration tests
 * (לא דורש Redis אמיתי).
 */

import type { EventBus } from '@catering/event-bus';

type Handler = (event: any) => Promise<void>;

/**
 * FakeBus - implementation מינימליסטי של EventBus interface ב-in-memory.
 * תומך ב-publish ו-subscribe אך לא ב-streams / DLQ / retries.
 */
export class FakeBus {
  private handlers = new Map<string, Handler[]>();
  public readonly published: Array<{ name: string; payload: any; metadata: any }> = [];

  async publish(name: string, payload: any, options: any = {}): Promise<string> {
    const id = `evt-${this.published.length + 1}`;
    const metadata = {
      id,
      timestamp: new Date().toISOString(),
      source: 'test',
      correlationId: options.correlationId,
      causationId: options.causationId,
      schemaVersion: 1,
    };
    this.published.push({ name, payload, metadata });

    // הפעלת ה-handlers באופן סינכרוני (מבלי להפיל אם הם זורקים)
    const list = this.handlers.get(name) ?? [];
    for (const h of list) {
      try {
        await h({ name, payload, metadata });
      } catch (err) {
        // נשמור את השגיאה ב-published לבדיקה
        this.published.push({
          name: '__handler.error__',
          payload: { source: name, error: (err as Error).message },
          metadata: { ...metadata, id: `err-${id}` },
        });
      }
    }
    return id;
  }

  subscribe(name: string, handler: Handler, _options: any = {}): void {
    const list = this.handlers.get(name) ?? [];
    list.push(handler);
    this.handlers.set(name, list);
  }

  async start(): Promise<void> {
    /* noop */
  }

  async stop(): Promise<void> {
    /* noop */
  }

  /** עוזר ל-asserts */
  eventsOfType(name: string): Array<{ payload: any; metadata: any }> {
    return this.published.filter((e) => e.name === name);
  }

  reset(): void {
    this.published.length = 0;
    this.handlers.clear();
  }
}

/**
 * FakeRedis - implementation in-memory של ה-API שמשמש את BaseAdapter
 * (exists / set / lpush). מספיק עבור idempotency + DLQ בבדיקות.
 */
export class FakeRedis {
  private store = new Map<string, string>();
  private lists = new Map<string, string[]>();

  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }

  async set(key: string, value: string, ..._args: any[]): Promise<string> {
    this.store.set(key, value);
    return 'OK';
  }

  async lpush(key: string, value: string): Promise<number> {
    const list = this.lists.get(key) ?? [];
    list.unshift(value);
    this.lists.set(key, list);
    return list.length;
  }

  async quit(): Promise<'OK'> {
    return 'OK';
  }

  /** עוזר ל-asserts */
  dlqEntries(adapterName: string): string[] {
    return this.lists.get(`adapter:dlq:${adapterName}`) ?? [];
  }
}

export function asBus(fake: FakeBus): EventBus {
  return fake as unknown as EventBus;
}
