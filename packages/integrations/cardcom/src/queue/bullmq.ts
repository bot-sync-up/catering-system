import { Queue, Worker, JobsOptions, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { CardComClient } from '../client/CardComClient';
import { IntegrationLogRepo } from '../db/IntegrationLogRepo';
import { logger } from '../utils/logger';
import { CardComError } from '../utils/errors';

export type CardComJobName =
  | 'charge'
  | 'refund'
  | 'tokenize'
  | 'recurring.create'
  | 'recurring.cancel';

export interface CardComJobData {
  flow: CardComJobName;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}

const DEFAULT_OPTS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};

export function createCardComQueue(redisUrl: string) {
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  const queue = new Queue<CardComJobData>('cardcom', { connection });
  const events = new QueueEvents('cardcom', { connection });
  return { queue, events, connection };
}

export function createCardComWorker(opts: {
  redisUrl: string;
  client: CardComClient;
  logs: IntegrationLogRepo;
}) {
  const connection = new IORedis(opts.redisUrl, { maxRetriesPerRequest: null });
  const worker = new Worker<CardComJobData>(
    'cardcom',
    async (job) => {
      const start = Date.now();
      const { flow, payload } = job.data;
      try {
        let result: unknown;
        switch (flow) {
          case 'charge':
            result = await opts.client.charge(payload as never);
            break;
          case 'refund':
            result = await opts.client.refund(payload as never);
            break;
          case 'tokenize':
            result = await opts.client.tokenize(payload as never);
            break;
          case 'recurring.create':
            result = await opts.client.createRecurring(payload as never);
            break;
          case 'recurring.cancel':
            result = await opts.client.cancelRecurring(payload as never);
            break;
          default:
            throw new Error(`unknown flow ${flow as string}`);
        }
        await opts.logs.write({
          createdAt: new Date(),
          flow,
          request: payload,
          response: result,
          attempt: job.attemptsMade + 1,
          success: true,
          durationMs: Date.now() - start,
        });
        return result;
      } catch (e) {
        const err = e as CardComError | Error;
        await opts.logs.write({
          createdAt: new Date(),
          flow,
          request: payload,
          errorMessage: err.message,
          httpStatus: (err as CardComError).httpStatus,
          attempt: job.attemptsMade + 1,
          success: false,
          durationMs: Date.now() - start,
        });
        // Re-throw so BullMQ retries (unless non-retryable)
        if (e instanceof CardComError && !e.retryable) {
          logger.warn({ code: e.code }, 'non-retryable CardCom error; aborting');
        }
        throw e;
      }
    },
    {
      connection,
      concurrency: Number(process.env.CARDCOM_WORKER_CONCURRENCY ?? 4),
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'cardcom job failed');
  });
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, flow: job.data.flow }, 'cardcom job completed');
  });

  return { worker, connection };
}

export async function enqueueCardComJob(
  queue: Queue<CardComJobData>,
  data: CardComJobData,
  overrideOpts: Partial<JobsOptions> = {}
) {
  return queue.add(data.flow, data, {
    ...DEFAULT_OPTS,
    jobId: data.idempotencyKey,
    ...overrideOpts,
  });
}
