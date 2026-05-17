import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const url = process.env.REDIS_URL || 'redis://localhost:6379';
export const connection = new IORedis(url, { maxRetriesPerRequest: null });

export const alertsQueue = new Queue('fleet-alerts', { connection });
export const alertsEvents = new QueueEvents('fleet-alerts', { connection });

export async function enqueueDailyScan() {
  // טעם השם: מבטל כפילויות באותו יום
  const today = new Date().toISOString().slice(0, 10);
  await alertsQueue.add(
    'daily-scan',
    { day: today },
    { jobId: `daily-${today}`, removeOnComplete: 100, removeOnFail: 50 },
  );
}

export async function enqueueRefreshAll() {
  await alertsQueue.add('refresh-all', {}, { removeOnComplete: 50 });
}
