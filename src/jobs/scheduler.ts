import { reportQueue, enqueueReport } from './queue';
import { prisma } from '../lib/prisma';

/**
 * Sync ScheduledReport rows in DB to BullMQ repeatable jobs.
 * Idempotent — call on app boot and whenever schedules change.
 */
export async function syncSchedules() {
  const schedules = await prisma.scheduledReport.findMany({
    where: { enabled: true },
  });

  // remove all existing repeatables
  const repeatable = await reportQueue.getRepeatableJobs();
  for (const r of repeatable) {
    await reportQueue.removeRepeatableByKey(r.key);
  }

  for (const s of schedules) {
    await enqueueReport(
      {
        scheduledReportId: s.id,
        type: s.type,
        format: s.format,
        params: s.params as any,
        recipients: s.recipients,
      },
      {
        repeat: { pattern: s.cron },
        jobId: `scheduled:${s.id}`,
      },
    );
  }
  return schedules.length;
}
