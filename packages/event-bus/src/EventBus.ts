/**
 * EventBus - עטיפה type-safe סביב BullMQ ו-Redis Streams.
 *
 * תומך בשני מודי פעולה:
 *  - "queue": BullMQ עם retries, DLQ, ו-priority (ברירת מחדל).
 *  - "stream": Redis Streams לאירועים שצריך לשמור עליהם history.
 *
 * שימוש לדוגמה:
 * ```ts
 * const bus = new EventBus({ redisUrl: 'redis://localhost:6379', source: 'crm-service' });
 * await bus.publish('lead.created', { leadId, customerName, ... });
 * bus.subscribe('lead.created', async (event) => { ... });
 * await bus.start();
 * ```
 */

import { Queue, Worker, QueueEvents, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import pino, { type Logger } from 'pino';
import type {
  DomainEvent,
  DomainEventMap,
  DomainEventName,
  EventHandler,
  EventMetadata,
} from './types.js';

export type EventBusMode = 'queue' | 'stream';

export interface EventBusConfig {
  /** Redis URL (e.g., redis://localhost:6379) */
  redisUrl: string;
  /** שם השירות שמפעיל את ה-bus - נכנס ל-metadata.source */
  source: string;
  /** מצב ברירת מחדל (queue או stream) */
  defaultMode?: EventBusMode;
  /** קידומת ל-queues / streams */
  prefix?: string;
  /** מספר retries ב-BullMQ */
  attempts?: number;
  /** Backoff strategy */
  backoffMs?: number;
  /** Logger אופציונלי */
  logger?: Logger;
  /** מקסימום entries בשמירת stream (לפני trim) */
  streamMaxLen?: number;
}

export interface PublishOptions {
  mode?: EventBusMode;
  correlationId?: string;
  causationId?: string;
  delay?: number;
  priority?: number;
}

export interface SubscribeOptions {
  mode?: EventBusMode;
  concurrency?: number;
  /** consumer group name (stream mode) */
  group?: string;
  /** consumer name (stream mode) */
  consumer?: string;
}

const DEFAULT_PREFIX = 'catering:events';
const DEFAULT_ATTEMPTS = 5;
const DEFAULT_BACKOFF_MS = 1_000;
const DEFAULT_STREAM_MAXLEN = 10_000;

export class EventBus {
  private readonly redis: Redis;
  private readonly streamRedis: Redis;
  private readonly config: Required<
    Omit<EventBusConfig, 'logger' | 'defaultMode'>
  > & {
    logger: Logger;
    defaultMode: EventBusMode;
  };
  private readonly queues = new Map<string, Queue>();
  private readonly workers = new Map<string, Worker>();
  private readonly queueEvents = new Map<string, QueueEvents>();
  private readonly streamSubscribers: Array<{
    name: string;
    handler: (event: DomainEvent) => Promise<void>;
    group: string;
    consumer: string;
    stop: () => void;
  }> = [];
  private started = false;

  constructor(config: EventBusConfig) {
    this.config = {
      redisUrl: config.redisUrl,
      source: config.source,
      defaultMode: config.defaultMode ?? 'queue',
      prefix: config.prefix ?? DEFAULT_PREFIX,
      attempts: config.attempts ?? DEFAULT_ATTEMPTS,
      backoffMs: config.backoffMs ?? DEFAULT_BACKOFF_MS,
      streamMaxLen: config.streamMaxLen ?? DEFAULT_STREAM_MAXLEN,
      logger: config.logger ?? pino({ name: `event-bus:${config.source}` }),
    };

    this.redis = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
    this.streamRedis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
    });
  }

  /**
   * פרסום אירוע ל-bus. ב-queue mode מוסיף ל-BullMQ.
   * ב-stream mode כותב ל-Redis Stream.
   */
  async publish<K extends DomainEventName>(
    name: K,
    payload: DomainEventMap[K],
    options: PublishOptions = {},
  ): Promise<string> {
    const mode = options.mode ?? this.config.defaultMode;
    const metadata: EventMetadata = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      source: this.config.source,
      correlationId: options.correlationId,
      causationId: options.causationId,
      schemaVersion: 1,
    };
    const event: DomainEvent<K> = { name, metadata, payload };

    this.config.logger.debug(
      { eventName: name, eventId: metadata.id, mode },
      'מפרסם אירוע',
    );

    if (mode === 'stream') {
      return this.publishToStream(event);
    }
    return this.publishToQueue(event, options);
  }

  private async publishToQueue<K extends DomainEventName>(
    event: DomainEvent<K>,
    options: PublishOptions,
  ): Promise<string> {
    const queue = this.getOrCreateQueue(event.name);
    const job = await queue.add(event.name, event, {
      jobId: event.metadata.id,
      delay: options.delay,
      priority: options.priority,
      attempts: this.config.attempts,
      backoff: { type: 'exponential', delay: this.config.backoffMs },
      removeOnComplete: { count: 1_000 },
      removeOnFail: false,
    });
    return job.id ?? event.metadata.id;
  }

  private async publishToStream<K extends DomainEventName>(
    event: DomainEvent<K>,
  ): Promise<string> {
    const streamKey = this.streamKey(event.name);
    const id = await this.streamRedis.xadd(
      streamKey,
      'MAXLEN',
      '~',
      this.config.streamMaxLen.toString(),
      '*',
      'event',
      JSON.stringify(event),
    );
    return id ?? event.metadata.id;
  }

  /**
   * רישום handler לאירוע מסוים.
   * הקריאה מחזירה מיד - ה-handlers יתחילו לעבד רק לאחר start().
   */
  subscribe<K extends DomainEventName>(
    name: K,
    handler: EventHandler<K>,
    options: SubscribeOptions = {},
  ): void {
    const mode = options.mode ?? this.config.defaultMode;
    if (mode === 'stream') {
      this.subscribeToStream(name, handler, options);
    } else {
      this.subscribeToQueue(name, handler, options);
    }
  }

  private subscribeToQueue<K extends DomainEventName>(
    name: K,
    handler: EventHandler<K>,
    options: SubscribeOptions,
  ): void {
    if (this.workers.has(name)) {
      throw new Error(`קיים כבר worker עבור האירוע ${name}`);
    }

    const worker = new Worker<DomainEvent<K>>(
      this.queueName(name),
      async (job: Job<DomainEvent<K>>) => {
        await handler(job.data);
      },
      {
        connection: this.redis.duplicate(),
        concurrency: options.concurrency ?? 1,
        autorun: false,
      },
    );

    worker.on('failed', (job, err) => {
      this.config.logger.error(
        { eventName: name, jobId: job?.id, err: err.message },
        'נכשל handler',
      );
    });

    this.workers.set(name, worker);
  }

  private subscribeToStream<K extends DomainEventName>(
    name: K,
    handler: EventHandler<K>,
    options: SubscribeOptions,
  ): void {
    const group = options.group ?? `${this.config.source}-group`;
    const consumer = options.consumer ?? `${this.config.source}-${uuidv4()}`;
    let stopped = false;

    const loop = async () => {
      const streamKey = this.streamKey(name);
      try {
        await this.streamRedis.xgroup(
          'CREATE',
          streamKey,
          group,
          '$',
          'MKSTREAM',
        );
      } catch {
        // group כבר קיים - מתעלמים
      }

      while (!stopped) {
        try {
          const result = (await this.streamRedis.xreadgroup(
            'GROUP',
            group,
            consumer,
            'COUNT',
            '10',
            'BLOCK',
            '2000',
            'STREAMS',
            streamKey,
            '>',
          )) as Array<[string, Array<[string, string[]]>]> | null;

          if (!result) continue;

          for (const [, entries] of result) {
            for (const [id, fields] of entries) {
              const idx = fields.indexOf('event');
              if (idx === -1) continue;
              const event = JSON.parse(fields[idx + 1]!) as DomainEvent<K>;
              try {
                await handler(event);
                await this.streamRedis.xack(streamKey, group, id);
              } catch (err) {
                this.config.logger.error(
                  { eventName: name, id, err: (err as Error).message },
                  'נכשל handler ב-stream',
                );
              }
            }
          }
        } catch (err) {
          if (!stopped) {
            this.config.logger.error(
              { err: (err as Error).message },
              'שגיאה ב-stream loop',
            );
            await new Promise((r) => setTimeout(r, 1_000));
          }
        }
      }
    };

    this.streamSubscribers.push({
      name,
      handler: handler as (event: DomainEvent) => Promise<void>,
      group,
      consumer,
      stop: () => {
        stopped = true;
      },
    });

    if (this.started) void loop();
    else {
      // נשמור reference כדי שנפעיל ב-start
      this.pendingStreamLoops.push(loop);
    }
  }

  private pendingStreamLoops: Array<() => Promise<void>> = [];

  /**
   * התחלת עיבוד workers/streams. חובה לקרוא לאחר subscribe.
   */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    for (const worker of this.workers.values()) {
      worker.run();
    }
    for (const loop of this.pendingStreamLoops) {
      void loop();
    }
    this.pendingStreamLoops = [];
    this.config.logger.info(
      { workers: this.workers.size, streams: this.streamSubscribers.length },
      'EventBus התחיל',
    );
  }

  /**
   * עצירה מסודרת של כל ה-workers וה-streams.
   */
  async stop(): Promise<void> {
    this.started = false;
    for (const sub of this.streamSubscribers) {
      sub.stop();
    }
    await Promise.all(
      Array.from(this.workers.values()).map((w) => w.close()),
    );
    await Promise.all(
      Array.from(this.queueEvents.values()).map((qe) => qe.close()),
    );
    await Promise.all(Array.from(this.queues.values()).map((q) => q.close()));
    await this.redis.quit();
    await this.streamRedis.quit();
    this.config.logger.info('EventBus נעצר');
  }

  /** קבלת queue (מיועד בעיקר לבדיקות) */
  getQueue<K extends DomainEventName>(name: K): Queue {
    return this.getOrCreateQueue(name);
  }

  private getOrCreateQueue(name: string): Queue {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(this.queueName(name), {
        connection: this.redis.duplicate(),
        prefix: this.config.prefix,
      });
      this.queues.set(name, queue);
    }
    return queue;
  }

  private queueName(name: string): string {
    return `${name}`;
  }

  private streamKey(name: string): string {
    return `${this.config.prefix}:stream:${name}`;
  }
}
