/**
 * BullMQ-backed async charge processor with IntegrationLog + DLQ.
 *
 * Job lifecycle:
 *   1. `processCharge` Worker picks up a ChargeJob.
 *   2. Writes an IntegrationLog entry (pending).
 *   3. Invokes CardcomClient.charge (already idempotent).
 *   4. On retryable failure → BullMQ retries with backoff.
 *   5. After `attempts` exhausted → moved to dead-letter queue `cardcom:dlq`.
 *   6. IntegrationLog updated on completion / failure.
 */
import { Queue, Worker, type Job, type ConnectionOptions } from 'bullmq';
import type { CardcomClient } from '../CardcomClient';
import type { ChargeInput, ChargeResponse } from '../types';
import { CardcomError } from '../errors';

export interface IntegrationLog {
  id: string;
  operation: string;
  status: 'pending' | 'success' | 'failed' | 'dlq';
  requestPayload: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  errorMessage?: string;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationLogStore {
  create(entry: Omit<IntegrationLog, 'createdAt' | 'updatedAt'>): Promise<IntegrationLog>;
  update(id: string, patch: Partial<IntegrationLog>): Promise<IntegrationLog>;
}

export interface ChargeJobData {
  /** Caller-supplied correlation id — used as both BullMQ jobId and IntegrationLog id. */
  jobId: string;
  charge: ChargeInput;
}

export interface ProcessChargeOptions {
  connection: ConnectionOptions;
  client: CardcomClient;
  integrationLog: IntegrationLogStore;
  /** Concurrency for the worker. Default 5. */
  concurrency?: number;
  /** Max attempts before DLQ. Default 5. */
  attempts?: number;
  /** Initial backoff delay. Default 1000ms. */
  backoffDelayMs?: number;
  /** Queue names — override for testing / multi-tenant. */
  queueName?: string;
  dlqName?: string;
}

const DEFAULT_QUEUE = 'cardcom:charge';
const DEFAULT_DLQ = 'cardcom:dlq';

export function createChargeQueue(connection: ConnectionOptions, queueName = DEFAULT_QUEUE) {
  return new Queue<ChargeJobData, ChargeResponse>(queueName, { connection });
}

export function createChargeWorker(opts: ProcessChargeOptions): {
  worker: Worker<ChargeJobData, ChargeResponse>;
  dlq: Queue<ChargeJobData>;
  shutdown: () => Promise<void>;
} {
  const queueName = opts.queueName ?? DEFAULT_QUEUE;
  const dlqName = opts.dlqName ?? DEFAULT_DLQ;
  const attempts = opts.attempts ?? 5;
  const backoffDelayMs = opts.backoffDelayMs ?? 1_000;
  const concurrency = opts.concurrency ?? 5;

  const dlq = new Queue<ChargeJobData>(dlqName, { connection: opts.connection });

  const worker = new Worker<ChargeJobData, ChargeResponse>(
    queueName,
    async (job: Job<ChargeJobData, ChargeResponse>) => {
      const { jobId, charge } = job.data;

      await opts.integrationLog
        .create({
          id: jobId,
          operation: 'cardcom.charge',
          status: 'pending',
          requestPayload: { ...charge, token: '***' },
          attempts: job.attemptsMade + 1,
        })
        .catch(() => undefined); // first attempt may already exist

      try {
        const result = await opts.client.charge({
          ...charge,
          idempotencyKey: charge.idempotencyKey ?? jobId,
        });
        await opts.integrationLog.update(jobId, {
          status: 'success',
          responsePayload: result as unknown as Record<string, unknown>,
          attempts: job.attemptsMade + 1,
          updatedAt: new Date(),
        });
        return result;
      } catch (err) {
        const cardcomErr = err instanceof CardcomError ? err : null;
        const message = err instanceof Error ? err.message : String(err);
        await opts.integrationLog.update(jobId, {
          status: 'failed',
          errorMessage: message,
          attempts: job.attemptsMade + 1,
          updatedAt: new Date(),
        });
        // Non-retryable → throw "fatal" so BullMQ doesn't keep retrying
        if (cardcomErr && !cardcomErr.retryable) {
          await dlq.add('terminal-failure', job.data, { jobId });
          await opts.integrationLog.update(jobId, { status: 'dlq', updatedAt: new Date() });
        }
        throw err;
      }
    },
    {
      connection: opts.connection,
      concurrency,
      // Each job uses these defaults unless overridden at enqueue time.
      // BullMQ also respects per-job opts, so enqueuers may tune attempts.
    },
  );

  // After all retries exhausted, move to DLQ.
  worker.on('failed', async (job, err) => {
    if (!job) return;
    if (job.attemptsMade >= attempts) {
      await dlq.add('exhausted', job.data, { jobId: job.id });
      await opts.integrationLog
        .update(job.data.jobId, {
          status: 'dlq',
          errorMessage: err.message,
          updatedAt: new Date(),
        })
        .catch(() => undefined);
    }
  });

  return {
    worker,
    dlq,
    async shutdown() {
      await worker.close();
      await dlq.close();
    },
  };
}

/**
 * Default enqueue helper — applies sensible retry/backoff defaults.
 */
export async function enqueueCharge(
  queue: Queue<ChargeJobData, ChargeResponse>,
  data: ChargeJobData,
  overrides: {
    attempts?: number;
    backoffDelayMs?: number;
    delay?: number;
  } = {},
) {
  return queue.add('charge', data, {
    jobId: data.jobId,
    attempts: overrides.attempts ?? 5,
    backoff: { type: 'exponential', delay: overrides.backoffDelayMs ?? 1_000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: false,
    delay: overrides.delay,
  });
}
