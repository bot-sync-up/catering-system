/**
 * BullMQ worker entrypoint. Run with: pnpm worker / npm run worker
 */
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from './db';
import { recomputeChurnAndUpsell } from './services/scoring';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

const remindersWorker = new Worker(
  'reminders',
  async (job) => {
    const { followUpId } = job.data as { followUpId: string };
    const fu = await prisma.followUp.findUnique({
      where: { id: followUpId },
      include: { owner: true, customer: true, lead: true },
    });
    if (!fu || fu.status !== 'PENDING') return;
    // In production: send email / push / WhatsApp here
    console.log(`[reminder] follow-up "${fu.title}" due for ${fu.owner.email}`);
    await prisma.followUp.update({
      where: { id: fu.id },
      data: { reminded: true },
    });
  },
  { connection },
);

const scoringWorker = new Worker(
  'scoring',
  async (job) => {
    const { customerId } = job.data as { customerId: string };
    await recomputeChurnAndUpsell(prisma, customerId);
  },
  { connection },
);

remindersWorker.on('failed', (job, err) => console.error('[reminder] failed', job?.id, err));
scoringWorker.on('failed', (job, err) => console.error('[scoring] failed', job?.id, err));

console.log('CRM worker started. Listening for jobs...');
