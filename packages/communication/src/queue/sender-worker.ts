import { Queue, Worker, QueueEvents, JobsOptions, Job } from 'bullmq';
import { UnifiedSender } from '../UnifiedSender';
import { Message, SendResult } from '../types';

/**
 * BullMQ worker for outbound communication.
 *
 * Why a queue?
 *   - Smooth out spikes (e.g. payday SMS blast)
 *   - Retry transient provider failures with exponential backoff
 *   - DLQ poison messages instead of losing them
 *   - Schedule future delivery (see scheduled-sender.ts)
 *
 * The worker is just a thin BullMQ shell around UnifiedSender.send().
 */

export interface SenderWorkerOptions {
  /** ioredis connection options. */
  connection: { host: string; port: number; password?: string; tls?: object };
  /** Queue name. Default: "communication". */
  queueName?: string;
  /** Concurrency per worker. Default: 25. */
  concurrency?: number;
  /** Total retry attempts (across all providers). Default: 5. */
  attempts?: number;
  /** Backoff base (ms). Default: 2_000. */
  backoffMs?: number;
}

export interface CommunicationJob {
  message: Message;
}

export class SenderQueue {
  readonly queue: Queue<CommunicationJob, SendResult[]>;
  readonly dlq: Queue<CommunicationJob>;
  private readonly options: Required<Omit<SenderWorkerOptions, 'connection'>> & {
    connection: SenderWorkerOptions['connection'];
  };

  constructor(opts: SenderWorkerOptions) {
    this.options = {
      queueName: opts.queueName ?? 'communication',
      concurrency: opts.concurrency ?? 25,
      attempts: opts.attempts ?? 5,
      backoffMs: opts.backoffMs ?? 2_000,
      connection: opts.connection,
    };
    this.queue = new Queue<CommunicationJob, SendResult[]>(this.options.queueName, {
      connection: this.options.connection,
      defaultJobOptions: {
        attempts: this.options.attempts,
        backoff: { type: 'exponential', delay: this.options.backoffMs },
        removeOnComplete: { age: 60 * 60 * 24, count: 10_000 },
        removeOnFail: false,
      },
    });
    this.dlq = new Queue<CommunicationJob>(`${this.options.queueName}-dlq`, {
      connection: this.options.connection,
    });
  }

  /** Enqueue a message. Returns the BullMQ job id. */
  async enqueue(message: Message, jobOptions?: JobsOptions): Promise<string> {
    const job = await this.queue.add(message.channel, { message }, {
      ...jobOptions,
      // If caller supplied an idempotencyKey, use it as the BullMQ jobId
      // — BullMQ enforces uniqueness, giving us natural dedup.
      jobId: message.idempotencyKey,
    });
    return String(job.id);
  }
}

export class SenderWorker {
  readonly worker: Worker<CommunicationJob, SendResult[]>;
  private readonly events: QueueEvents;

  constructor(
    private readonly senderQueue: SenderQueue,
    private readonly unified: UnifiedSender,
    opts: { connection: SenderWorkerOptions['connection']; concurrency?: number },
  ) {
    this.events = new QueueEvents(senderQueue.queue.name, { connection: opts.connection });
    this.worker = new Worker<CommunicationJob, SendResult[]>(
      senderQueue.queue.name,
      async (job: Job<CommunicationJob>) => this.process(job),
      { connection: opts.connection, concurrency: opts.concurrency ?? 25 },
    );
    this.worker.on('failed', (job, err) => {
      // After final attempt → push to DLQ for manual review.
      if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
        void senderQueue.dlq.add('dead', job.data, {
          attempts: 1,
          removeOnComplete: false,
          removeOnFail: false,
        });
        console.error(`[sender-worker] job ${job.id} failed permanently: ${err.message}`);
      }
    });
  }

  private async process(job: Job<CommunicationJob>): Promise<SendResult[]> {
    const results = await this.unified.send(job.data.message);
    // If ALL recipients failed with retryable errors, throw so BullMQ retries.
    if (results.every((r) => r.status === 'failed' && r.error?.retryable !== false)) {
      throw new Error(`All recipients failed retryably: ${results[0]?.error?.message ?? 'unknown'}`);
    }
    return results;
  }

  async close() {
    await this.worker.close();
    await this.events.close();
  }
}
