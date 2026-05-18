import { Queue, Worker, QueueEvents, type Processor } from 'bullmq';
import { bullConnection } from '../lib/redis.js';

export const queues = {
  send: new Queue('send', bullConnection),
  campaign: new Queue('campaign', bullConnection),
  reminder: new Queue('reminder', bullConnection),
  segment: new Queue('segment', bullConnection),
  attribution: new Queue('attribution', bullConnection),
  adSync: new Queue('adSync', bullConnection),
};

export function startWorker<T = any>(name: keyof typeof queues, processor: Processor<T>) {
  const w = new Worker<T>(name, processor, { ...bullConnection, concurrency: 5 });
  const events = new QueueEvents(name, bullConnection);
  events.on('failed', ({ jobId, failedReason }) => {
    console.error(`[bullmq:${name}] job ${jobId} failed`, failedReason);
  });
  return w;
}
