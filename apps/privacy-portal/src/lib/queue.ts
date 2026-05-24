import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

// חיבור Redis יחיד עבור כל ה-queues
let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return connection;
}

// קווי משימות שונים — אחד ל-SAR, אחד למחיקה
export const SAR_QUEUE = "privacy.sar";
export const ERASURE_QUEUE = "privacy.erasure";

let sarQueue: Queue | null = null;
let erasureQueue: Queue | null = null;

export function getSarQueue(): Queue {
  if (!sarQueue) {
    sarQueue = new Queue(SAR_QUEUE, { connection: getRedisConnection() });
  }
  return sarQueue;
}

export function getErasureQueue(): Queue {
  if (!erasureQueue) {
    erasureQueue = new Queue(ERASURE_QUEUE, { connection: getRedisConnection() });
  }
  return erasureQueue;
}

export function getSarEvents(): QueueEvents {
  return new QueueEvents(SAR_QUEUE, { connection: getRedisConnection() });
}
