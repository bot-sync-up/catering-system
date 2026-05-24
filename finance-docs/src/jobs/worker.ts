// BullMQ workers — execute scheduled work.
import { Worker } from 'bullmq';
import { connection } from './queues.js';
import { prisma } from '../lib/db.js';
import { reminderService } from '../services/reminders.js';
import { sendEmail, sendSms, sendWhatsApp } from '../services/notify.js';
import { customerService } from '../services/customers.js';
import { checkService } from '../services/checks.js';
import { ils } from '../lib/money.js';

const TEMPLATES = {
  'step-1': (n: string, amt: string) => `תזכורת ראשונה: יתרה פתוחה במסמך ${n} בסך ${amt}.`,
  'step-2': (n: string, amt: string) => `תזכורת שנייה: יתרה פתוחה ${amt} במסמך ${n}.`,
  'step-3': (n: string, amt: string) => `תזכורת שלישית: נא לסלק יתרה ${amt} (${n}).`,
  final:    (n: string, amt: string) => `תזכורת אחרונה לפני העברה לטיפול משפטי. יתרה ${amt} במסמך ${n}.`,
} as const;

export const reminderWorker = new Worker('reminders', async (job) => {
  if (job.name !== 'sweep') return;
  const due = await reminderService.due();
  for (const r of due) {
    const tmpl = (TEMPLATES as any)[r.template] ?? TEMPLATES['step-1'];
    const body = tmpl(r.document.number, ils(Number(r.document.balance)));
    if (Number(r.document.balance) <= 0) {
      await reminderService.markSkipped(r.id, 'balance cleared');
      continue;
    }
    try {
      if (r.channel === 'EMAIL' && r.customer.email) {
        await sendEmail(r.customer.email, `תזכורת תשלום — ${r.document.number}`, `<div dir="rtl">${body}</div>`);
      } else if (r.channel === 'SMS' && r.customer.phone) {
        await sendSms(r.customer.phone, body);
      } else if (r.channel === 'WHATSAPP' && (r.customer.whatsapp || r.customer.phone)) {
        await sendWhatsApp(r.customer.whatsapp ?? r.customer.phone!, body);
      } else {
        await reminderService.markSkipped(r.id, `no contact for ${r.channel}`);
        continue;
      }
      await reminderService.markSent(r.id);
    } catch (err: any) {
      await reminderService.markFailed(r.id, String(err?.message ?? err));
    }
  }
}, { connection });

export const freezeWorker = new Worker('freeze', async (job) => {
  if (job.name !== 'sweep') return;
  const customers = await prisma.customer.findMany({ select: { id: true } });
  for (const c of customers) {
    await prisma.$transaction(async (tx) => {
      await customerService.recheckFreezeTx(tx, c.id);
    });
  }
}, { connection });

export const checksWorker = new Worker('checks', async (job) => {
  if (job.name !== 'upcoming') return;
  const upcoming = await checkService.upcoming(7);
  // Notify accountant of upcoming check deposits — log to audit table.
  for (const ch of upcoming) {
    await prisma.auditLog.create({
      data: {
        action: 'POSTDATED_CHECK_DUE',
        meta: { checkId: ch.id, dueDate: ch.dueDate, amount: ch.amount, customerId: ch.customerId },
      },
    });
  }
}, { connection });

export const agingWorker = new Worker('aging', async (job) => {
  if (job.name !== 'refresh') return;
  // Mark documents OVERDUE if past dueDate and unpaid.
  const now = new Date();
  await prisma.document.updateMany({
    where: {
      dueDate: { lt: now },
      balance: { gt: 0 },
      status: { in: ['ISSUED', 'SENT', 'PARTIAL_PAID'] },
    },
    data: { status: 'OVERDUE' },
  });
}, { connection });

console.log('finance-docs workers up');
