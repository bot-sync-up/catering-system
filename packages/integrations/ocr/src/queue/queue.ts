import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import type { IngestEnvelope } from '../channels/types.js';
import { runPipeline, type PipelineDeps, type PipelineResult } from '../pipeline.js';

export const QUEUE_NAME = 'invoice-ocr';

/**
 * BullMQ queue + worker. Retries with exponential backoff: 5 attempts,
 * starting at 5s, capped (BullMQ caps at the configured delay's
 * jittered exp). DLQ via the standard `failed` event.
 */
export function makeRedis(): IORedis {
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  return new IORedis(url, { maxRetriesPerRequest: null });
}

export function makeQueue(connection = makeRedis()): Queue<IngestEnvelope> {
  return new Queue<IngestEnvelope>(QUEUE_NAME, { connection });
}

export interface JobPayload {
  envelope: IngestEnvelope & { bytes: string }; // base64 over the wire
}

export async function enqueueEnvelope(
  queue: Queue,
  envelope: IngestEnvelope,
): Promise<string | undefined> {
  const job = await queue.add(
    `ingest-${envelope.source}`,
    {
      envelope: { ...envelope, bytes: envelope.bytes.toString('base64') },
    } satisfies JobPayload,
    {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86_400 },
    },
  );
  return job.id;
}

export function makeWorker(
  deps: PipelineDeps,
  connection = makeRedis(),
): Worker<JobPayload, PipelineResult> {
  return new Worker<JobPayload, PipelineResult>(
    QUEUE_NAME,
    async (job: Job<JobPayload>) => {
      const env = job.data.envelope;
      return runPipeline(
        { ...env, bytes: Buffer.from(env.bytes, 'base64') },
        deps,
      );
    },
    {
      connection,
      concurrency: Number(process.env.OCR_CONCURRENCY || 2),
    },
  );
}
