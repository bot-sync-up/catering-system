import { Queue, QueueEvents, Worker } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let _connection: IORedis | null = null;
function getConnection() {
  if (!_connection) {
    _connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
  }
  return _connection;
}

export const QUEUES = {
  reminders: 'reminders',
  scoring: 'scoring',
} as const;

let _remindersQueue: Queue | null = null;
export function getRemindersQueue() {
  if (!_remindersQueue) {
    _remindersQueue = new Queue(QUEUES.reminders, { connection: getConnection() });
  }
  return _remindersQueue;
}

let _scoringQueue: Queue | null = null;
export function getScoringQueue() {
  if (!_scoringQueue) {
    _scoringQueue = new Queue(QUEUES.scoring, { connection: getConnection() });
  }
  return _scoringQueue;
}

export async function scheduleReminder(followUpId: string, dueAt: Date) {
  const delay = Math.max(0, dueAt.getTime() - Date.now());
  try {
    await getRemindersQueue().add(
      'remind',
      { followUpId },
      { delay, jobId: `fu:${followUpId}`, removeOnComplete: true, removeOnFail: 100 },
    );
  } catch (e) {
    // Redis not available in this env: degrade gracefully
    console.warn('[queues] could not schedule reminder:', (e as Error).message);
  }
}

export async function enqueueScoring(customerId: string) {
  try {
    await getScoringQueue().add('score', { customerId }, { removeOnComplete: true });
  } catch (e) {
    console.warn('[queues] could not enqueue scoring:', (e as Error).message);
  }
}

export { Worker, QueueEvents };
export const redisConnection = getConnection;
