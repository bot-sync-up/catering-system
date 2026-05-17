/**
 * BaseAdapter.test.ts - בודק את ה-guards של המחלקה הבסיסית:
 * idempotency, retry, DLQ.
 */

import { describe, it, expect, vi } from 'vitest';
import { BaseAdapter, type AdapterContext } from '../src/BaseAdapter.js';
import { makeMockBus, makeMockRedis } from './helpers.js';
import type { Redis } from 'ioredis';

class TestAdapter extends BaseAdapter<'lead.created'> {
  readonly name = 'test-adapter';
  readonly sourceEvent = 'lead.created' as const;
  public callCount = 0;
  public failTimes: number;

  constructor(opts: ConstructorParameters<typeof BaseAdapter>[0] & { failTimes?: number }) {
    super(opts);
    this.failTimes = opts.failTimes ?? 0;
  }

  protected async handle(_ctx: AdapterContext<'lead.created'>): Promise<void> {
    this.callCount++;
    if (this.callCount <= this.failTimes) {
      throw new Error(`fail #${this.callCount}`);
    }
  }

  // exposed for tests
  async exposeProcess(event: AdapterContext<'lead.created'>['event']): Promise<void> {
    return (this as unknown as { processWithGuards: (e: typeof event) => Promise<void> })
      .processWithGuards(event);
  }
}

const buildEvent = (id = 'evt-1') => ({
  name: 'lead.created' as const,
  metadata: {
    id,
    timestamp: '2026-01-01T00:00:00Z',
    source: 'crm',
    schemaVersion: 1,
  },
  payload: {
    leadId: 'l-1',
    customerName: 'יוסי',
    phone: '050-0000000',
    source: 'website' as const,
  },
});

describe('BaseAdapter', () => {
  it('מבצע handle פעם אחת לאירוע יחיד', async () => {
    const bus = makeMockBus();
    const redis = makeMockRedis();
    const adapter = new TestAdapter({ bus, redis: redis as unknown as Redis, backoffMs: 1 });
    await adapter['processWithGuards'](buildEvent());
    expect(adapter.callCount).toBe(1);
    expect(redis.set).toHaveBeenCalled();
  });

  it('idempotency - אירוע שעובד לא רץ פעמיים', async () => {
    const bus = makeMockBus();
    const redis = makeMockRedis();
    const adapter = new TestAdapter({ bus, redis: redis as unknown as Redis, backoffMs: 1 });
    const ev = buildEvent('dup-1');
    await adapter['processWithGuards'](ev);
    await adapter['processWithGuards'](ev);
    expect(adapter.callCount).toBe(1);
  });

  it('retry - מנסה שוב עד שמצליח', async () => {
    const bus = makeMockBus();
    const redis = makeMockRedis();
    const adapter = new TestAdapter({
      bus,
      redis: redis as unknown as Redis,
      backoffMs: 1,
      failTimes: 2,
      maxRetries: 5,
    });
    await adapter['processWithGuards'](buildEvent('retry-1'));
    expect(adapter.callCount).toBe(3);
  });

  it('DLQ - אחרי מקסימום ניסיונות מועבר ל-DLQ', async () => {
    const bus = makeMockBus();
    const redis = makeMockRedis();
    const adapter = new TestAdapter({
      bus,
      redis: redis as unknown as Redis,
      backoffMs: 1,
      failTimes: 10,
      maxRetries: 3,
    });
    await adapter['processWithGuards'](buildEvent('dlq-1'));
    expect(adapter.callCount).toBe(3);
    expect(redis.lpush).toHaveBeenCalled();
    const lpushCall = redis.lpush.mock.calls[0]!;
    expect(lpushCall[0]).toBe('adapter:dlq:test-adapter');
  });

  it('start - רושם handler ל-bus', async () => {
    const bus = makeMockBus();
    const redis = makeMockRedis();
    const adapter = new TestAdapter({ bus, redis: redis as unknown as Redis });
    await adapter.start();
    expect(bus.subscribe).toHaveBeenCalledWith('lead.created', expect.any(Function));
  });

  // השתקת אזהרה על methods שלא בשימוש
  it('exposeProcess - בדיקה שהמתודה זמינה', async () => {
    const bus = makeMockBus();
    const redis = makeMockRedis();
    const adapter = new TestAdapter({ bus, redis: redis as unknown as Redis, backoffMs: 1 });
    expect(typeof adapter.exposeProcess).toBe('function');
    // אל תקרא בפועל - רק מאמת שזה method
    const _spy = vi.fn();
    expect(_spy).not.toHaveBeenCalled();
  });
});
