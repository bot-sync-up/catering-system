import 'dotenv/config';
import { Worker } from 'bullmq';
import { connection } from './queue.js';
import { processDueAlerts, refreshAllDocumentAlerts } from '../services/alerts.js';

const worker = new Worker(
  'fleet-alerts',
  async (job) => {
    if (job.name === 'daily-scan') {
      const n = await processDueAlerts();
      return { processed: n };
    }
    if (job.name === 'refresh-all') {
      const n = await refreshAllDocumentAlerts();
      return { refreshed: n };
    }
    return { skipped: true };
  },
  { connection },
);

worker.on('completed', (job, ret) => {
  console.log(`[worker] job ${job.id} completed`, ret);
});
worker.on('failed', (job, err) => {
  console.error(`[worker] job ${job?.id} failed`, err);
});

console.log('Fleet alerts worker started');
