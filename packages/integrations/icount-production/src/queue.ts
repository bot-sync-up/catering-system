/**
 * queue.ts — BullMQ wrapper לפעולות iCount
 * עם retry אקספוננציאלי
 *
 * תצורת retry:
 *   - 5 attempts
 *   - exponential backoff
 *   - delay בסיסי: 5,000 ms
 */

import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import IORedis, { Redis } from 'ioredis';
import { IBillingAdapter } from './adapters';
import { AdapterFactory } from './AdapterFactory';
import { IntegrationLogEntry, Logger } from './types';

export const ICOUNT_QUEUE_NAME = 'icount-jobs';

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 5_000,
  },
  removeOnComplete: { count: 1000, age: 24 * 3600 },
  removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
};

export type IcountJobType =
  | 'createInvoice'
  | 'createTaxInvoice'
  | 'createReceipt'
  | 'createQuote'
  | 'createCreditNote'
  | 'cancelDocument'
  | 'getAllocationNumber'
  | 'syncCustomer'
  | 'syncSupplier';

export interface IcountJobData {
  type: IcountJobType;
  payload: Record<string, unknown>;
  preferProvider?: 'icount' | 'greeninvoice' | 'rivhit' | 'mock';
  referenceId?: string;
}

export interface QueueDeps {
  connection: Redis | { host: string; port: number; password?: string };
  factory: AdapterFactory;
  logSink?: (e: IntegrationLogEntry) => Promise<void> | void;
  logger?: Logger;
}

export function createIcountQueue(deps: QueueDeps, opts?: QueueOptions): Queue<IcountJobData> {
  const connection: any = deps.connection instanceof IORedis ? deps.connection : new IORedis(deps.connection as any);
  return new Queue<IcountJobData>(ICOUNT_QUEUE_NAME, {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
    ...opts,
  });
}

export function createIcountWorker(deps: QueueDeps, opts?: WorkerOptions): Worker<IcountJobData> {
  const connection: any = deps.connection instanceof IORedis ? deps.connection : new IORedis(deps.connection as any);

  return new Worker<IcountJobData>(
    ICOUNT_QUEUE_NAME,
    async (job: Job<IcountJobData>) => {
      const start = Date.now();
      const ref = job.data.referenceId ?? `${job.id}`;
      try {
        const { result, provider } = await deps.factory.execute(
          a => dispatch(a, job.data),
          { preferProvider: job.data.preferProvider },
        );

        await deps.logSink?.({
          id: ref,
          timestamp: new Date().toISOString(),
          provider: provider as IntegrationLogEntry['provider'],
          operation: job.data.type,
          method: 'queue',
          success: true,
          attempt: job.attemptsMade + 1,
          duration_ms: Date.now() - start,
          request_payload: job.data.payload,
          response_payload: result,
          reference_id: ref,
        });
        return result;
      } catch (e) {
        await deps.logSink?.({
          id: ref,
          timestamp: new Date().toISOString(),
          provider: 'icount',
          operation: job.data.type,
          method: 'queue',
          success: false,
          error: (e as Error).message,
          attempt: job.attemptsMade + 1,
          duration_ms: Date.now() - start,
          request_payload: job.data.payload,
          reference_id: ref,
        });
        throw e;
      }
    },
    { connection, concurrency: 5, ...opts },
  );
}

async function dispatch(adapter: IBillingAdapter, data: IcountJobData): Promise<unknown> {
  switch (data.type) {
    case 'createInvoice':       return adapter.createInvoice(data.payload as any);
    case 'createTaxInvoice':    return adapter.createTaxInvoice(data.payload as any);
    case 'createReceipt':       return adapter.createReceipt(data.payload as any);
    case 'createQuote':         return adapter.createQuote(data.payload as any);
    case 'createCreditNote':    return adapter.createCreditNote(data.payload as any);
    case 'cancelDocument':      return adapter.cancelDocument(data.payload as any);
    case 'getAllocationNumber': return adapter.getAllocationNumber(data.payload as any);
    case 'syncCustomer':        return adapter.syncCustomer(data.payload as any);
    case 'syncSupplier':        return adapter.syncSupplier(data.payload as any);
    default:
      throw new Error(`Unknown job type: ${(data as { type: string }).type}`);
  }
}
