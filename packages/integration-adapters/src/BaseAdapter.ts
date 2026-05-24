/**
 * BaseAdapter - מחלקת בסיס לכל ה-integration adapters בפלטפורמה.
 *
 * אחראית על:
 *  - מחזור חיים (start / stop)
 *  - idempotency (זיהוי אירועים שכבר עובדו)
 *  - retry עם exponential backoff
 *  - העברת הודעות שכשלו ל-DLQ
 *  - לוגינג עם pino
 *
 * כל adapter יורש מ-BaseAdapter, מגדיר `sourceEvent` ו-`handle`
 * (לדוגמה: `crm-to-finance` שומע ל-`lead.qualified` ויוצר Quote).
 */

import type { Redis } from 'ioredis';
import { Redis as IoRedis } from 'ioredis';
import pino, { type Logger } from 'pino';
import type {
  DomainEvent,
  DomainEventName,
  EventBus,
} from '@catering/event-bus';

export interface BaseAdapterOptions {
  /** ה-EventBus שאליו ה-adapter מתחבר */
  bus: EventBus;
  /** Redis לצורכי idempotency cache */
  redis?: Redis;
  /** Redis URL חלופי במקום instance מוכן */
  redisUrl?: string;
  /** Logger אופציונלי */
  logger?: Logger;
  /** מקסימום ניסיונות לפני העברה ל-DLQ */
  maxRetries?: number;
  /** Backoff התחלתי במילישניות */
  backoffMs?: number;
  /** Time-to-live של מפתחות idempotency בשניות */
  idempotencyTtlSeconds?: number;
}

export interface AdapterContext<K extends DomainEventName> {
  event: DomainEvent<K>;
  /** מספר הניסיון הנוכחי (1-based) */
  attempt: number;
}

/**
 * מחלקה אבסטרקטית - כל adapter קונקרטי חייב לממש:
 *  - `name`: שם ה-adapter לצורכי לוגים ו-Redis keys
 *  - `sourceEvent`: שם האירוע שאליו ה-adapter מאזין
 *  - `handle(ctx)`: הלוגיקה המרכזית
 */
export abstract class BaseAdapter<K extends DomainEventName> {
  abstract readonly name: string;
  abstract readonly sourceEvent: K;

  protected readonly bus: EventBus;
  protected readonly redis: Redis;
  protected readonly logger: Logger;
  protected readonly maxRetries: number;
  protected readonly backoffMs: number;
  protected readonly idempotencyTtl: number;
  private running = false;
  private ownsRedis = false;

  constructor(options: BaseAdapterOptions) {
    this.bus = options.bus;
    this.maxRetries = options.maxRetries ?? 5;
    this.backoffMs = options.backoffMs ?? 1_000;
    this.idempotencyTtl = options.idempotencyTtlSeconds ?? 60 * 60 * 24;
    this.logger = options.logger ?? pino({ name: `adapter:${this.constructor.name}` });

    if (options.redis) {
      this.redis = options.redis;
    } else if (options.redisUrl) {
      this.redis = new IoRedis(options.redisUrl, { maxRetriesPerRequest: null });
      this.ownsRedis = true;
    } else {
      throw new Error('חובה להעביר redis או redisUrl ל-BaseAdapter');
    }
  }

  /** מימוש קונקרטי של הלוגיקה - חייב ב-subclass */
  protected abstract handle(ctx: AdapterContext<K>): Promise<void>;

  /**
   * הפעלת ה-adapter - רושם את עצמו כ-subscriber ל-bus.
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    this.bus.subscribe<K>(this.sourceEvent, async (event) => {
      await this.processWithGuards(event);
    });

    this.logger.info(
      { adapter: this.name, event: this.sourceEvent },
      'adapter התחיל',
    );
  }

  /**
   * עצירת ה-adapter (סוגר את ה-Redis אם נוצר על-ידו).
   */
  async stop(): Promise<void> {
    this.running = false;
    if (this.ownsRedis) {
      await this.redis.quit();
    }
    this.logger.info({ adapter: this.name }, 'adapter נעצר');
  }

  /**
   * עיבוד אירוע עם idempotency + retry + DLQ.
   */
  private async processWithGuards(event: DomainEvent<K>): Promise<void> {
    if (await this.alreadyProcessed(event.metadata.id)) {
      this.logger.debug(
        { adapter: this.name, eventId: event.metadata.id },
        'אירוע כבר עובד (idempotency)',
      );
      return;
    }

    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.handle({ event, attempt });
        await this.markProcessed(event.metadata.id);
        return;
      } catch (err) {
        lastError = err as Error;
        this.logger.warn(
          {
            adapter: this.name,
            eventId: event.metadata.id,
            attempt,
            err: lastError.message,
          },
          'נכשל handle - מנסה שוב',
        );
        if (attempt < this.maxRetries) {
          await this.sleep(this.backoffMs * 2 ** (attempt - 1));
        }
      }
    }

    await this.sendToDeadLetterQueue(event, lastError!);
  }

  private async alreadyProcessed(eventId: string): Promise<boolean> {
    const key = this.idempotencyKey(eventId);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  private async markProcessed(eventId: string): Promise<void> {
    const key = this.idempotencyKey(eventId);
    await this.redis.set(key, '1', 'EX', this.idempotencyTtl);
  }

  private idempotencyKey(eventId: string): string {
    return `adapter:idemp:${this.name}:${eventId}`;
  }

  private async sendToDeadLetterQueue(
    event: DomainEvent<K>,
    error: Error,
  ): Promise<void> {
    const key = `adapter:dlq:${this.name}`;
    await this.redis.lpush(
      key,
      JSON.stringify({
        event,
        error: { message: error.message, stack: error.stack },
        failedAt: new Date().toISOString(),
      }),
    );
    this.logger.error(
      { adapter: this.name, eventId: event.metadata.id, err: error.message },
      'הועבר ל-DLQ אחרי כל הניסיונות',
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
