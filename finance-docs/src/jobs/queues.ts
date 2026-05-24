// BullMQ queues — reminders, aging refresh, postdated checks, freeze sweep.
import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../lib/config.js';

export const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });

export const reminderQueue = new Queue('reminders', { connection });
export const agingQueue = new Queue('aging', { connection });
export const checksQueue = new Queue('checks', { connection });
export const freezeQueue = new Queue('freeze', { connection });

export const reminderEvents = new QueueEvents('reminders', { connection });

export async function bootstrapRecurring() {
  // Daily reminder sweep (every hour we look for due rows).
  await reminderQueue.add('sweep', {}, {
    repeat: { pattern: '0 * * * *' }, // every hour
    removeOnComplete: true,
  });
  // Aging recompute daily at 02:00.
  await agingQueue.add('refresh', {}, {
    repeat: { pattern: '0 2 * * *' },
    removeOnComplete: true,
  });
  // Check upcoming postdated checks daily at 06:00.
  await checksQueue.add('upcoming', {}, {
    repeat: { pattern: '0 6 * * *' },
    removeOnComplete: true,
  });
  // Customer freeze sweep daily at 03:00.
  await freezeQueue.add('sweep', {}, {
    repeat: { pattern: '0 3 * * *' },
    removeOnComplete: true,
  });
}
