import { SenderQueue } from './sender-worker';
import { Message } from '../types';

/**
 * Schedule a message for future delivery.
 *
 * Uses BullMQ's `delay` option — simpler than running our own cron table,
 * and works correctly across worker restarts because BullMQ persists
 * delays in Redis.
 *
 * For very-far-future schedules (>30 days), consider storing in your
 * DB and re-enqueueing daily; BullMQ holds delayed jobs in memory and
 * Redis maxmemory eviction can hurt you.
 */
export class ScheduledSender {
  constructor(private readonly queue: SenderQueue) {}

  /** Schedule for a specific timestamp. */
  async scheduleAt(message: Message, when: Date): Promise<string> {
    const delay = Math.max(0, when.getTime() - Date.now());
    return this.queue.enqueue(message, { delay });
  }

  /** Convenience: schedule N minutes from now. */
  async scheduleIn(message: Message, minutes: number): Promise<string> {
    return this.scheduleAt(message, new Date(Date.now() + minutes * 60_000));
  }

  /** Cancel a scheduled message by jobId returned at scheduleAt time. */
  async cancel(jobId: string): Promise<boolean> {
    const job = await this.queue.queue.getJob(jobId);
    if (!job) return false;
    await job.remove();
    return true;
  }
}
