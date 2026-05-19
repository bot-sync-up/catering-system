/**
 * scheduled-check — BullMQ cron יומי שמפעיל verifyHashChain ושולח התראה
 * אם נמצאו רשומות פגומות.
 */
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import type { PrismaClient } from '@prisma/client';
import { verifyHashChain, type VerificationResult } from './verify';

export interface ScheduledIntegrityOptions {
  prisma: PrismaClient;
  redisConnection: ConnectionOptions;
  /** Cron pattern. ברירת מחדל: כל יום ב-04:00 */
  cron?: string;
  /** ימים אחורה לסריקה (ברירת מחדל: 2). ההנחה: סריקה מלאה רק שבועית. */
  daysBack?: number;
  /** callback להתראה (Sentry / Slack / SMS לאדמין) */
  onTamperingDetected: (result: VerificationResult) => Promise<void> | void;
}

export function startScheduledIntegrityCheck(options: ScheduledIntegrityOptions): {
  queue: Queue;
  worker: Worker;
  stop: () => Promise<void>;
} {
  const queueName = 'audit-integrity-check';
  const queue = new Queue(queueName, { connection: options.redisConnection });

  const cron = options.cron ?? '0 4 * * *';

  // ביטול job קודם אם קיים
  void queue.removeRepeatableByKey(`${queueName}:::cron`).catch(() => undefined);

  void queue.add(
    queueName,
    {},
    {
      repeat: { pattern: cron },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  );

  const worker = new Worker(
    queueName,
    async () => {
      const since = new Date(Date.now() - (options.daysBack ?? 2) * 24 * 60 * 60 * 1000);
      const result = await verifyHashChain(options.prisma, { since });
      if (!result.ok) {
        await options.onTamperingDetected(result);
      }
      return result;
    },
    { connection: options.redisConnection, concurrency: 1 },
  );

  return {
    queue,
    worker,
    async stop() {
      await worker.close();
      await queue.close();
    },
  };
}
