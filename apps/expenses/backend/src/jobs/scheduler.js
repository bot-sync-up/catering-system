/**
 * Scheduler — BullMQ-backed if Redis available, otherwise node-cron fallback.
 * Auto-creates monthly recurring expenses on day 1 of each month at 02:00.
 */
const { generateForMonth } = require('../modules/recurring/service');

let useBull = false;
let queue, worker;

function startScheduler() {
  if (process.env.REDIS_HOST && process.env.REDIS_HOST !== 'disabled') {
    try {
      const { Queue, Worker } = require('bullmq');
      const IORedis = require('ioredis');
      const connection = new IORedis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || 6379),
        maxRetriesPerRequest: null,
      });

      queue = new Queue('recurring-expenses', { connection });

      // Repeating job: 1st of each month at 02:00
      queue.add(
        'generate-monthly',
        {},
        {
          repeat: { pattern: '0 2 1 * *', tz: 'Asia/Jerusalem' },
          removeOnComplete: 20,
        }
      );

      worker = new Worker(
        'recurring-expenses',
        async () => {
          const now = new Date();
          return generateForMonth(now.getFullYear(), now.getMonth() + 1);
        },
        { connection }
      );

      worker.on('completed', (job, result) => {
        console.log('[scheduler] generated', result);
      });
      worker.on('failed', (job, err) => {
        console.error('[scheduler] failed', err);
      });

      useBull = true;
      console.log('[scheduler] BullMQ scheduler started');
      return;
    } catch (e) {
      console.warn('[scheduler] BullMQ unavailable, falling back to node-cron:', e.message);
    }
  }

  // node-cron fallback
  const cron = require('node-cron');
  cron.schedule(
    '0 2 1 * *',
    async () => {
      const now = new Date();
      try {
        const r = await generateForMonth(now.getFullYear(), now.getMonth() + 1);
        console.log('[cron] generated', r);
      } catch (e) {
        console.error('[cron] failed', e);
      }
    },
    { timezone: 'Asia/Jerusalem' }
  );
  console.log('[scheduler] node-cron scheduler started');
}

module.exports = { startScheduler };
