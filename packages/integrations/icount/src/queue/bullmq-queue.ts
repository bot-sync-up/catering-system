/**
 * BullMQ-based job queue for resilient invoice/sync operations
 * Exponential backoff + dead letter queue + retry inspection
 */

import { Job, Queue, QueueEvents, Worker } from 'bullmq';
import IORedis, { Redis, RedisOptions } from 'ioredis';

import { createLogger } from '../utils/logger';

const log = createLogger('bullmq-queue');

export type JobName =
  | 'create-invoice'
  | 'create-receipt'
  | 'create-quote'
  | 'allocate-number'
  | 'sync-customer'
  | 'send-document'
  | 'webhook-deliver';

export interface JobPayload {
  type: JobName;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface QueueConfig {
  name?: string;
  connection?: RedisOptions | Redis;
  defaultJobOptions?: {
    attempts?: number;
    backoffDelay?: number;
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
  };
}

export type JobProcessor<R = unknown> = (job: Job<JobPayload>) => Promise<R>;

export class IntegrationQueue {
  public readonly queue: Queue<JobPayload>;
  public readonly events: QueueEvents;
  private readonly connection: Redis;
  private workers: Worker<JobPayload>[] = [];
  private readonly queueName: string;

  constructor(config: QueueConfig = {}) {
    this.queueName = config.name ?? 'icount-integration';

    if (config.connection && typeof (config.connection as Redis).status === 'string') {
      this.connection = config.connection as Redis;
    } else {
      this.connection = new IORedis(
        (config.connection as RedisOptions) ?? {
          host: process.env.REDIS_HOST ?? '127.0.0.1',
          port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
          maxRetriesPerRequest: null,
        },
      );
    }

    const jobOpts = config.defaultJobOptions;
    this.queue = new Queue<JobPayload>(this.queueName, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: jobOpts?.attempts ?? 5,
        backoff: {
          type: 'exponential',
          delay: jobOpts?.backoffDelay ?? 5_000,
        },
        removeOnComplete: jobOpts?.removeOnComplete ?? 1_000,
        removeOnFail: jobOpts?.removeOnFail ?? 5_000,
      },
    });

    this.events = new QueueEvents(this.queueName, { connection: this.connection.duplicate() });

    this.events.on('completed', ({ jobId }) => {
      log.debug({ jobId }, 'job completed');
    });
    this.events.on('failed', ({ jobId, failedReason }) => {
      log.warn({ jobId, failedReason }, 'job failed');
    });
  }

  async enqueue(payload: JobPayload, opts?: { delay?: number; jobId?: string }): Promise<string> {
    const job = await this.queue.add(payload.type, payload, {
      delay: opts?.delay,
      jobId: opts?.jobId,
    });
    return job.id ?? '';
  }

  registerWorker(name: JobName, processor: JobProcessor, concurrency = 5): Worker<JobPayload> {
    const worker = new Worker<JobPayload>(
      this.queueName,
      async (job) => {
        if (job.name !== name) return undefined;
        log.debug({ jobId: job.id, name: job.name, attempt: job.attemptsMade }, 'processing job');
        return processor(job);
      },
      { connection: this.connection.duplicate(), concurrency },
    );

    worker.on('error', (err) => {
      log.error({ err: err.message }, 'worker error');
    });

    this.workers.push(worker);
    return worker;
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
    await this.events.close();
    await this.queue.close();
    if (this.connection.status !== 'end') {
      this.connection.disconnect();
    }
  }

  async pendingCount(): Promise<{ active: number; waiting: number; failed: number }> {
    const [active, waiting, failed] = await Promise.all([
      this.queue.getActiveCount(),
      this.queue.getWaitingCount(),
      this.queue.getFailedCount(),
    ]);
    return { active, waiting, failed };
  }
}
