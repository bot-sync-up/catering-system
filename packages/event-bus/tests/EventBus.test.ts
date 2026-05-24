/**
 * EventBus.test.ts - בדיקות unit ל-EventBus.
 *
 * הבדיקות מבוצעות עם מוקים ל-BullMQ ול-ioredis,
 * כך שאין צורך ב-Redis אמיתי בזמן הריצה.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── מוקים ל-BullMQ ול-ioredis ─────────────────────────────────
const addMock = vi.fn(async (_name: string, data: { metadata: { id: string } }) => ({
  id: data.metadata.id,
}));
const closeQueueMock = vi.fn(async () => {});
const runMock = vi.fn();
const closeWorkerMock = vi.fn(async () => {});
const onMock = vi.fn();
const xaddMock = vi.fn(async () => '1-0');
const xgroupMock = vi.fn(async () => 'OK');
const xreadgroupMock = vi.fn(async () => null);
const xackMock = vi.fn(async () => 1);
const quitMock = vi.fn(async () => 'OK');

vi.mock('bullmq', () => {
  return {
    Queue: vi.fn().mockImplementation(() => ({
      add: addMock,
      close: closeQueueMock,
    })),
    Worker: vi.fn().mockImplementation(() => ({
      run: runMock,
      close: closeWorkerMock,
      on: onMock,
    })),
    QueueEvents: vi.fn().mockImplementation(() => ({
      close: vi.fn(async () => {}),
    })),
  };
});

vi.mock('ioredis', () => {
  class Redis {
    duplicate() {
      return new Redis();
    }
    xadd = xaddMock;
    xgroup = xgroupMock;
    xreadgroup = xreadgroupMock;
    xack = xackMock;
    quit = quitMock;
  }
  return { Redis, default: Redis };
});

import { EventBus } from '../src/EventBus.js';
import type { LeadCreatedPayload } from '../src/types.js';

describe('EventBus', () => {
  beforeEach(() => {
    addMock.mockClear();
    xaddMock.mockClear();
    runMock.mockClear();
    closeQueueMock.mockClear();
    closeWorkerMock.mockClear();
    quitMock.mockClear();
  });

  it('מפרסם אירוע למצב queue עם metadata תקין', async () => {
    const bus = new EventBus({
      redisUrl: 'redis://localhost:6379',
      source: 'test-service',
    });

    const payload: LeadCreatedPayload = {
      leadId: 'lead-1',
      customerName: 'דני כהן',
      phone: '050-1234567',
      source: 'website',
    };

    const id = await bus.publish('lead.created', payload);
    expect(id).toBeDefined();
    expect(addMock).toHaveBeenCalledTimes(1);

    const [eventName, eventData] = addMock.mock.calls[0]!;
    expect(eventName).toBe('lead.created');
    expect(eventData.metadata.source).toBe('test-service');
    expect(eventData.metadata.id).toBeDefined();
    expect(eventData.metadata.schemaVersion).toBe(1);

    await bus.stop();
  });

  it('מפרסם אירוע למצב stream', async () => {
    const bus = new EventBus({
      redisUrl: 'redis://localhost:6379',
      source: 'test-service',
      defaultMode: 'stream',
    });

    await bus.publish('inventory.low', {
      sku: 'SKU-1',
      productName: 'עגבניות',
      currentQuantity: 5,
      thresholdQuantity: 20,
      reorderQuantity: 50,
      warehouseId: 'WH-1',
    });

    expect(xaddMock).toHaveBeenCalledTimes(1);
    await bus.stop();
  });

  it('subscribe יוצר worker חדש פר אירוע', async () => {
    const bus = new EventBus({
      redisUrl: 'redis://localhost:6379',
      source: 'test-service',
    });

    const handler = vi.fn(async () => {});
    bus.subscribe('order.placed', handler);

    await bus.start();
    expect(runMock).toHaveBeenCalledTimes(1);

    await bus.stop();
    expect(closeWorkerMock).toHaveBeenCalledTimes(1);
  });

  it('subscribe לאותו event פעמיים זורק שגיאה', async () => {
    const bus = new EventBus({
      redisUrl: 'redis://localhost:6379',
      source: 'test-service',
    });

    bus.subscribe('order.placed', async () => {});
    expect(() => bus.subscribe('order.placed', async () => {})).toThrow(
      /order.placed/,
    );

    await bus.stop();
  });

  it('correlationId ו-causationId נשמרים ב-metadata', async () => {
    const bus = new EventBus({
      redisUrl: 'redis://localhost:6379',
      source: 'crm',
    });

    await bus.publish(
      'quote.sent',
      {
        quoteId: 'q-1',
        leadId: 'l-1',
        customerId: 'c-1',
        totalAmount: 5000,
        currency: 'ILS',
        validUntil: '2026-12-31',
        items: [],
      },
      { correlationId: 'corr-1', causationId: 'cause-1' },
    );

    const [, eventData] = addMock.mock.calls[0]!;
    expect(eventData.metadata.correlationId).toBe('corr-1');
    expect(eventData.metadata.causationId).toBe('cause-1');

    await bus.stop();
  });
});
