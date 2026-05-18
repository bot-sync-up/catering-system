import { startWorker, queues } from './services/queue.js';
import { sendToLead } from './services/sender.js';
import { fireReminder } from './jobs/reminders.js';
import { runNpsAutoTick } from './jobs/npsAuto.js';
import { syncMetaSpend, syncGoogleSpend } from './services/adPlatforms.js';
import { evaluateSegment } from './services/segmentation.js';
import { logger } from './lib/logger.js';

logger.info('worker starting');

// Per-message send worker
startWorker<{
  leadId: string;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
  templateId?: string;
  campaignId?: string;
  variantId?: string;
}>('send', async (job) => {
  await sendToLead(job.data);
});

// Reminder worker
startWorker<{ reminderId: string }>('reminder', async (job) => {
  await fireReminder(job.data.reminderId);
});

// Segment evaluation worker
startWorker<{ segmentId: string }>('segment', async (job) => {
  await evaluateSegment(job.data.segmentId);
});

// Ad sync worker
startWorker<{ source?: 'meta' | 'google' }>('adSync', async (job) => {
  if (!job.data.source || job.data.source === 'meta') await syncMetaSpend();
  if (!job.data.source || job.data.source === 'google') await syncGoogleSpend();
});

// Cron-style schedulers (recurring)
await queues.adSync.add('cron', {}, { repeat: { pattern: '0 */6 * * *' } });
await queues.segment.add('reeval-all', {}, { repeat: { pattern: '0 * * * *' } });

// In-process NPS auto-trigger tick
setInterval(() => {
  runNpsAutoTick().catch((e) => logger.error('npsAuto failed', e));
}, 5 * 60_000);

logger.info('worker ready');
