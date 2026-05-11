import { describe, it, expect } from 'vitest';
import { EventBus } from '@catering/event-bus';
import { BaseAdapter, InMemoryIdempotencyStore, InMemoryDLQ } from '../src/BaseAdapter.js';

class TestAdapter extends BaseAdapter {
  readonly name = 'test-adapter';
  public calls = 0;
  public failTimes = 0;
  protected register(): void {
    this.on('lead.created', 'process-lead', async () => {
      this.calls++;
      if (this.calls <= this.failTimes) {
        throw new Error('boom');
      }
    });
  }
}

describe('BaseAdapter', () => {
  it('processes event once on success', async () => {
    const bus = new EventBus({ inMemory: true });
    const adapter = new TestAdapter({ bus });
    await adapter.start();
    await bus.start();

    await bus.publish('lead.created', { leadId: 'L1', customerName: 'A', phone: '050' });

    expect(adapter.calls).toBe(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    const bus = new EventBus({ inMemory: true });
    const adapter = new TestAdapter({ bus, maxAttempts: 5, initialBackoffMs: 1 });
    adapter.failTimes = 2;
    await adapter.start();
    await bus.start();

    await bus.publish('lead.created', { leadId: 'L1', customerName: 'A', phone: '050' });

    expect(adapter.calls).toBe(3);
  });

  it('sends to DLQ after maxAttempts', async () => {
    const bus = new EventBus({ inMemory: true });
    const dlq = new InMemoryDLQ();
    const adapter = new TestAdapter({ bus, maxAttempts: 3, initialBackoffMs: 1, dlq });
    adapter.failTimes = 99;
    await adapter.start();
    await bus.start();

    await bus.publish('lead.created', { leadId: 'L1', customerName: 'A', phone: '050' });

    expect(adapter.calls).toBe(3);
    expect(dlq.entries).toHaveLength(1);
    expect(dlq.entries[0]?.action).toBe('process-lead');
  });

  it('skips already-processed events (idempotency)', async () => {
    const bus = new EventBus({ inMemory: true });
    const store = new InMemoryIdempotencyStore();
    const adapter = new TestAdapter({ bus, idempotency: store });
    await adapter.start();
    await bus.start();

    const id = 'fixed-event-id-1';
    await bus.publish('lead.created', { leadId: 'L1', customerName: 'A', phone: '050' }, { id });
    await bus.publish('lead.created', { leadId: 'L1', customerName: 'A', phone: '050' }, { id });

    expect(adapter.calls).toBe(1);
  });
});
