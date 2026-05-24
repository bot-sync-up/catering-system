import { Queue, QueueEvents, Worker, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const REPORT_QUEUE = 'reports';

export const reportQueue = new Queue(REPORT_QUEUE, { connection });
export const reportQueueEvents = new QueueEvents(REPORT_QUEUE, { connection });

export interface ReportJobData {
  scheduledReportId?: string;
  type: string;
  format: 'XLSX' | 'PDF' | 'JSON';
  params: Record<string, any>;
  recipients: string[];
}

export async function enqueueReport(data: ReportJobData, opts?: JobsOptions) {
  return reportQueue.add('run-report', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
    ...opts,
  });
}

export { connection };
export { Worker };
