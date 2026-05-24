/**
 * EventBus — wrapper type-safe סביב BullMQ עם תמיכה ב-Redis Streams.
 *
 * שימוש בסיסי:
 *   const bus = new EventBus({ host: 'localhost', port: 6379 });
 *   await bus.publish('order.placed', { orderId: '...', ... });
 *   bus.subscribe('order.placed', async (evt) => { ... });
 *   await bus.start();
 *
 * הערות עיצוב:
 * - כל event type מקבל queue/stream נפרד (כדי לאפשר scaling נפרד).
 * - publish יוצר event-id אוטומטית אלא אם סופק.
 * - subscribe מקבל handler async — שגיאות זורקות retry של BullMQ.
 * - shutdown נקי דרך stop().
 *
 * BullMQ והקליינטים של ioredis נטענים lazily כדי לאפשר ל-vitest
 * לרוץ ללא Redis אמיתי (mock).
 */
import { randomUUID } from 'node:crypto';
import pino, { type Logger } from 'pino';
import type {
  AnyDomainEvent,
  DomainEvent,
  EventHandler,
  EventName,
  EventTypeMap,
  PublishOptions,
  RedisConnectionConfig,
} from './types.js';

// טיפוסים מינימליים של BullMQ ו-ioredis כדי לא להישען על types בזמן build.
type AnyQueue = { add: (name: string, data: unknown, opts?: Record<string, unknown>) => Promise<unknown>; close: () => Promise<void> };
type AnyWorker = { close: () => Promise<void> };
type AnyRedis = { xadd: (...args: unknown[]) => Promise<unknown>; quit: () => Promise<unknown>; xreadgroup?: (...args: unknown[]) => Promise<unknown> };

export interface EventBusOptions extends RedisConnectionConfig {
  /** קידומת לכל ה-queues (ברירת מחדל: 'catering:') */
  prefix?: string;
  /** logger מותאם אישית */
  logger?: Logger;
  /** ב-test mode הכל בזיכרון (אין חיבור לרדיס) */
  inMemory?: boolean;
}

interface InMemoryHandlerEntry<TName extends EventName> {
  name: TName;
  handler: EventHandler<TName>;
}

/**
 * EventBus — class יחיד, type-safe על פני כל ה-events.
 */
export class EventBus {
  private readonly opts: EventBusOptions;
  private readonly logger: Logger;
  private readonly queues = new Map<EventName, AnyQueue>();
  private readonly workers = new Map<EventName, AnyWorker>();
  private readonly handlers = new Map<EventName, EventHandler<EventName>[]>();
  private redis: AnyRedis | null = null;
  private started = false;
  private readonly inMemoryHandlers: InMemoryHandlerEntry<EventName>[] = [];

  constructor(opts: EventBusOptions = {}) {
    this.opts = { prefix: 'catering:', ...opts };
    this.logger = opts.logger ?? pino({ name: 'event-bus', level: process.env.LOG_LEVEL ?? 'info' });
  }

  /** התחל לעבד events (יוצר workers לכל queue רשום). */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    if (this.opts.inMemory) {
      this.logger.info('event-bus started in-memory');
      return;
    }

    // טעינה דינמית כדי לא לכפות BullMQ ב-build/test
    const bullmq = await this.loadBullMQ();
    const connection = await this.createConnection();

    for (const [eventName, handlers] of this.handlers.entries()) {
      const queueName = this.queueName(eventName);
      const worker = new bullmq.Worker(
        queueName,
        async (job: { id?: string; data: AnyDomainEvent; attemptsMade?: number }) => {
          const evt = job.data;
          this.logger.debug({ eventType: evt.type, eventId: evt.id, jobId: job.id }, 'processing event');
          for (const h of handlers) {
            await (h as EventHandler<typeof evt.type>)(evt as never);
          }
        },
        { connection, prefix: this.opts.prefix }
      );
      worker.on('failed', (job: unknown, err: Error) => {
        this.logger.error({ err, jobId: (job as { id?: string } | undefined)?.id }, 'job failed');
      });
      this.workers.set(eventName, worker as AnyWorker);
    }

    this.logger.info({ workers: this.workers.size }, 'event-bus started');
  }

  /** עצור worker/queue/redis בצורה מסודרת. */
  async stop(): Promise<void> {
    for (const w of this.workers.values()) await w.close();
    for (const q of this.queues.values()) await q.close();
    if (this.redis) await this.redis.quit();
    this.workers.clear();
    this.queues.clear();
    this.redis = null;
    this.started = false;
    this.logger.info('event-bus stopped');
  }

  /**
   * publish event — type safe.
   * אם useStreams=true, פרסום ל-Redis Stream במקום BullMQ Queue.
   */
  async publish<TName extends EventName>(
    name: TName,
    payload: EventTypeMap[TName],
    options: PublishOptions = {}
  ): Promise<DomainEvent<TName, EventTypeMap[TName]>> {
    const event: DomainEvent<TName, EventTypeMap[TName]> = {
      id: options.id ?? randomUUID(),
      type: name,
      occurredAt: new Date().toISOString(),
      payload,
    };

    this.logger.debug({ eventType: name, eventId: event.id }, 'publishing event');

    if (this.opts.inMemory) {
      // dispatch סינכרוני ב-test mode
      const matching = this.inMemoryHandlers.filter((h) => h.name === name);
      for (const { handler } of matching) {
        await (handler as EventHandler<TName>)(event);
      }
      return event;
    }

    if (this.opts.useStreams) {
      const redis = await this.getRedis();
      const streamKey = `${this.opts.prefix}stream:${name}`;
      await redis.xadd(streamKey, '*', 'event', JSON.stringify(event));
      return event;
    }

    const queue = await this.getQueue(name);
    await queue.add(name, event, {
      jobId: event.id,
      delay: options.delayMs,
      priority: options.priority,
      attempts: options.attempts ?? 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
    return event;
  }

  /**
   * subscribe — רישום handler לאירוע.
   * כל ה-subscribe חייב לקרות לפני start().
   */
  subscribe<TName extends EventName>(name: TName, handler: EventHandler<TName>): void {
    if (this.started && !this.opts.inMemory) {
      throw new Error('Cannot subscribe after EventBus.start() was called');
    }
    const list = (this.handlers.get(name) ?? []) as EventHandler<EventName>[];
    list.push(handler as EventHandler<EventName>);
    this.handlers.set(name, list);
    this.inMemoryHandlers.push({ name, handler: handler as EventHandler<EventName> });
  }

  // ---------------------------------------------------------------------------
  //                              Internals
  // ---------------------------------------------------------------------------

  private queueName(name: EventName): string {
    return name; // BullMQ נותן prefix לבד דרך opts.prefix
  }

  private async getQueue(name: EventName): Promise<AnyQueue> {
    let q = this.queues.get(name);
    if (q) return q;
    const bullmq = await this.loadBullMQ();
    const connection = await this.createConnection();
    q = new bullmq.Queue(this.queueName(name), { connection, prefix: this.opts.prefix }) as AnyQueue;
    this.queues.set(name, q);
    return q;
  }

  private async getRedis(): Promise<AnyRedis> {
    if (this.redis) return this.redis;
    const { default: IORedis } = await import('ioredis');
    const cfg = this.opts;
    this.redis = (cfg.url ? new IORedis(cfg.url) : new IORedis({
      host: cfg.host ?? '127.0.0.1',
      port: cfg.port ?? 6379,
      password: cfg.password,
      db: cfg.db,
      maxRetriesPerRequest: null,
    })) as unknown as AnyRedis;
    return this.redis;
  }

  private async createConnection(): Promise<AnyRedis> {
    return this.getRedis();
  }

  private async loadBullMQ(): Promise<{ Queue: new (n: string, o: unknown) => AnyQueue; Worker: new (n: string, p: unknown, o: unknown) => AnyWorker }> {
    // טעינה דינמית — bullmq הוא optional ב-test/in-memory
    const mod = (await import('bullmq')) as unknown as {
      Queue: new (n: string, o: unknown) => AnyQueue;
      Worker: new (n: string, p: unknown, o: unknown) => AnyWorker;
    };
    return mod;
  }
}
