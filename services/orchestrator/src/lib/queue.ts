import { Queue, QueueEvents, Worker, JobsOptions } from 'bullmq';
import { config } from './config';
import { logger } from './logger';

/**
 * BullMQ configuration-only wiring.
 * No Redis connection is opened until a queue/worker is actually instantiated by the caller.
 * In test/dev we typically don't open Redis at all — workflows run inline.
 */
export const redisConnection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
} as const;

export const QUEUE_NAMES = {
  newEventOrder: 'orchestrator:new-event-order',
  approveAndBill: 'orchestrator:approve-and-bill',
  cancelEvent: 'orchestrator:cancel-event',
  compensation: 'orchestrator:compensation',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const queues = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection: redisConnection });
    queues.set(name, q);
    logger.debug({ queue: name }, 'queue created');
  }
  return q;
}

export const defaultJobOpts: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1500 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

export { Queue, QueueEvents, Worker };
