/**
 * BaseAdapter — abstract class המספק את התשתית המשותפת לכל ה-adapters.
 *
 * אחריות:
 * - רישום ל-events רלוונטיים (subscribeAll)
 * - idempotency check (event_id + target_action) — שמירת מפתחות שכבר טופלו
 * - retry עם backoff
 * - שליחה ל-DLQ (dead letter queue) על כשלים סופיים
 * - pino logging עם context אחיד
 *
 * כל adapter ממומש דרך הרחבה של ה-class:
 *   class MyAdapter extends BaseAdapter {
 *     readonly name = 'my-adapter';
 *     protected register() {
 *       this.on('order.placed', async (evt) => { ... });
 *     }
 *   }
 *
 * שמירת ה-idempotency keys מתבצעת ע"י store ניתן-להזרקה
 * (ברירת מחדל: in-memory Set). ב-production מזריקים Redis-backed store.
 */
import pino, { type Logger } from 'pino';
import type { EventBus, EventName, EventTypeMap, DomainEvent } from '@catering/event-bus';

export interface IdempotencyStore {
  /** מחזיר true אם המפתח כבר נראה (ולכן לדלג) */
  seen(key: string): Promise<boolean>;
  /** מסמן מפתח כטופל */
  mark(key: string, ttlSeconds?: number): Promise<void>;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly set = new Set<string>();
  async seen(key: string): Promise<boolean> { return this.set.has(key); }
  async mark(key: string): Promise<void> { this.set.add(key); }
}

export interface DeadLetterQueue {
  /** שמירה ל-DLQ אחרי כשל סופי */
  push(entry: { adapter: string; action: string; event: unknown; error: unknown; attempts: number }): Promise<void>;
}

export class InMemoryDLQ implements DeadLetterQueue {
  readonly entries: Array<{ adapter: string; action: string; event: unknown; error: unknown; attempts: number }> = [];
  async push(entry: { adapter: string; action: string; event: unknown; error: unknown; attempts: number }): Promise<void> {
    this.entries.push(entry);
  }
}

export interface BaseAdapterOptions {
  bus: EventBus;
  idempotency?: IdempotencyStore;
  dlq?: DeadLetterQueue;
  logger?: Logger;
  /** מספר ניסיונות לפני שליחה ל-DLQ (ברירת מחדל: 3) */
  maxAttempts?: number;
  /** backoff התחלתי במילישניות (ברירת מחדל: 200) */
  initialBackoffMs?: number;
}

export abstract class BaseAdapter {
  /** שם ה-adapter — חייב להיות ייחודי */
  abstract readonly name: string;

  protected readonly bus: EventBus;
  protected readonly logger: Logger;
  protected readonly idempotency: IdempotencyStore;
  protected readonly dlq: DeadLetterQueue;
  protected readonly maxAttempts: number;
  protected readonly initialBackoffMs: number;
  private running = false;

  constructor(opts: BaseAdapterOptions) {
    this.bus = opts.bus;
    this.idempotency = opts.idempotency ?? new InMemoryIdempotencyStore();
    this.dlq = opts.dlq ?? new InMemoryDLQ();
    this.maxAttempts = opts.maxAttempts ?? 3;
    this.initialBackoffMs = opts.initialBackoffMs ?? 200;
    this.logger = (opts.logger ?? pino()).child({ adapter: this.constructor.name });
  }

  /**
   * register — מקום שבו ה-adapter רושם handlers על ה-bus.
   * מימוש ע"י כל adapter קונקרטי.
   */
  protected abstract register(): void;

  /** start — רושם handlers וקורא ל-bus.start אם מועבר */
  async start(): Promise<void> {
    if (this.running) return;
    this.register();
    this.running = true;
    this.logger.info({ adapter: this.name }, 'adapter started');
  }

  /** stop — מסמן ירידה. ה-bus עצמו לא נסגר כאן (אחריות חיצונית). */
  async stop(): Promise<void> {
    this.running = false;
    this.logger.info({ adapter: this.name }, 'adapter stopped');
  }

  /**
   * helper לרישום handler עטוף ב-idempotency + retry + DLQ.
   * ה-action הוא שם הפעולה שהאדפטר מבצע (e.g. 'create-invoice').
   */
  protected on<TName extends EventName>(
    eventName: TName,
    action: string,
    handler: (evt: DomainEvent<TName, EventTypeMap[TName]>) => Promise<void>
  ): void {
    this.bus.subscribe(eventName, async (evt) => {
      const idemKey = `${evt.id}:${action}`;
      const log = this.logger.child({ eventType: eventName, eventId: evt.id, action });

      if (await this.idempotency.seen(idemKey)) {
        log.debug('skip — already processed (idempotency hit)');
        return;
      }

      let attempt = 0;
      let lastError: unknown = null;
      while (attempt < this.maxAttempts) {
        attempt++;
        try {
          await handler(evt);
          await this.idempotency.mark(idemKey);
          log.info({ attempt }, 'processed ok');
          return;
        } catch (err) {
          lastError = err;
          log.warn({ err, attempt }, 'handler failed');
          if (attempt < this.maxAttempts) {
            await this.sleep(this.initialBackoffMs * Math.pow(2, attempt - 1));
          }
        }
      }

      log.error({ err: lastError, attempts: attempt }, 'sending to DLQ');
      await this.dlq.push({
        adapter: this.name,
        action,
        event: evt,
        error: lastError,
        attempts: attempt,
      });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
