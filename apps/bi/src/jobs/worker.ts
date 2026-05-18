import { Worker, REPORT_QUEUE, connection, ReportJobData } from './queue';
import { runReport } from '../lib/reportRunner';
import { sendEmail } from '../lib/email';
import { prisma } from '../lib/prisma';
import { ReportType, ReportFormat } from '@prisma/client';

/**
 * BullMQ worker that:
 *   1. Runs the requested aggregation
 *   2. Emails the artifact via SendGrid
 *   3. Updates ScheduledReport.lastRunAt
 */
const worker = new Worker<ReportJobData>(
  REPORT_QUEUE,
  async (job) => {
    const { type, format, params, recipients, scheduledReportId } = job.data;
    const filter = {
      from: new Date(params.from),
      to: new Date(params.to),
      agentId: params.agentId,
      customerId: params.customerId,
      category: params.category,
      officialOnly: params.officialOnly,
    };
    const out = await runReport({
      type: type as ReportType,
      format: format as ReportFormat,
      filter,
      year: params.year,
    });

    if (recipients?.length) {
      await sendEmail({
        to: recipients,
        subject: `דוח ${type} - ${new Date().toLocaleDateString('he-IL')}`,
        text: `מצורף דוח ${type}.`,
        attachments: [{
          filename: out.filename,
          content: out.buffer,
          contentType: out.contentType,
        }],
      });
    }

    if (scheduledReportId) {
      await prisma.scheduledReport.update({
        where: { id: scheduledReportId },
        data: { lastRunAt: new Date() },
      });
    }

    await prisma.report.create({
      data: {
        type: type as ReportType,
        format: format as ReportFormat,
        params: params as any,
      },
    });

    return { ok: true, filename: out.filename };
  },
  { connection, concurrency: 4 },
);

worker.on('completed', (job, res) => {
  console.log(`[worker] job ${job.id} done`, res);
});
worker.on('failed', (job, err) => {
  console.error(`[worker] job ${job?.id} failed`, err);
});

console.log('[worker] listening on queue', REPORT_QUEUE);
