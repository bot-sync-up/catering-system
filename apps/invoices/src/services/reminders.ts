// ReminderService — schedule reminders for unpaid documents.
// Default cadence: at issue+7, +14, +30, +45 days.
import type { ReminderChannel } from '@prisma/client';
import { prisma } from '../lib/db.js';

export const REMINDER_CADENCE_DAYS = [7, 14, 30, 45];

export class ReminderService {
  /** Schedule the standard reminder cadence for a document. */
  async scheduleForDocument(documentId: string, channel: ReminderChannel = 'EMAIL') {
    const doc = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    const base = doc.dueDate ?? doc.issueDate;
    const rows = REMINDER_CADENCE_DAYS.map((d, i) => ({
      documentId: doc.id,
      customerId: doc.customerId,
      channel,
      scheduledAt: new Date(base.getTime() + d * 24 * 3600 * 1000),
      template: i === REMINDER_CADENCE_DAYS.length - 1 ? 'final' : `step-${i + 1}`,
    }));
    return prisma.reminder.createMany({ data: rows });
  }

  /** Reminders due now and not sent. */
  async due(now = new Date()) {
    return prisma.reminder.findMany({
      where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
      include: { document: true, customer: true },
      take: 100,
    });
  }

  async markSent(id: string) {
    return prisma.reminder.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }
  async markFailed(id: string, payload: string) {
    return prisma.reminder.update({
      where: { id },
      data: { status: 'FAILED', payload, attempt: { increment: 1 } },
    });
  }
  async markSkipped(id: string, reason: string) {
    return prisma.reminder.update({
      where: { id },
      data: { status: 'SKIPPED', payload: reason },
    });
  }
}

export const reminderService = new ReminderService();
