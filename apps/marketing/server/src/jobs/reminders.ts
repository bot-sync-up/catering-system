import { prisma } from '../lib/prisma.js';
import { queues } from '../services/queue.js';
import { sendToLead } from '../services/sender.js';

/**
 * Schedule a reminder for a lead at runAt time. Uses BullMQ delayed jobs.
 */
export async function scheduleReminder(opts: {
  leadId: string;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
  templateId?: string;
  payload?: any;
  runAt: Date;
}) {
  const r = await prisma.scheduledReminder.create({
    data: {
      leadId: opts.leadId,
      channel: opts.channel,
      templateId: opts.templateId,
      payload: opts.payload ?? {},
      runAt: opts.runAt,
    },
  });
  const delay = Math.max(0, opts.runAt.getTime() - Date.now());
  const job = await queues.reminder.add('fire', { reminderId: r.id }, { delay });
  await prisma.scheduledReminder.update({ where: { id: r.id }, data: { jobId: job.id } });
  return r;
}

export async function fireReminder(reminderId: string) {
  const r = await prisma.scheduledReminder.findUnique({ where: { id: reminderId } });
  if (!r || r.status !== 'PENDING') return;
  try {
    await sendToLead({
      leadId: r.leadId,
      channel: r.channel,
      templateId: r.templateId ?? undefined,
      variables: r.payload as any,
    });
    await prisma.scheduledReminder.update({ where: { id: r.id }, data: { status: 'SENT' } });
  } catch (err: any) {
    await prisma.scheduledReminder.update({
      where: { id: r.id },
      data: { status: 'FAILED', payload: { ...((r.payload as any) ?? {}), error: err.message } },
    });
    throw err;
  }
}
