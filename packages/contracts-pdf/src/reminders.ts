import type { Contract } from './types.js';

export type ReminderJob = {
  contractId: string;
  fireAt: string;
  reason: 'renewal' | 'expiry';
  to: string;
  subject: string;
  body: string;
};

/**
 * Compute reminder jobs for a contract. Designed to be invoked by a cron worker.
 * Strategy:
 *   - If contract has effectiveTo + renewalReminderDays > 0: schedule one reminder N days before end
 *   - Also schedule a final "expiry" reminder on the day of expiry.
 */
export function computeReminderJobs(c: Contract): ReminderJob[] {
  if (!c.effectiveTo) return [];
  const end = new Date(c.effectiveTo);
  if (Number.isNaN(end.getTime())) return [];

  const jobs: ReminderJob[] = [];

  if (c.renewalReminderDays && c.renewalReminderDays > 0) {
    const fire = new Date(end);
    fire.setDate(fire.getDate() - c.renewalReminderDays);
    jobs.push({
      contractId: c.id,
      fireAt: fire.toISOString(),
      reason: 'renewal',
      to: c.client.email,
      subject: `תזכורת חידוש: ${c.title}`,
      body: renderEmail({
        clientName: c.client.name,
        title: c.title,
        endDate: end,
        daysLeft: c.renewalReminderDays,
        renewLink: process.env.NEXT_PUBLIC_SITE_URL
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/contracts/${c.id}/renew`
          : `/contracts/${c.id}/renew`,
        provider: c.provider.name,
      }),
    });
  }

  jobs.push({
    contractId: c.id,
    fireAt: end.toISOString(),
    reason: 'expiry',
    to: c.client.email,
    subject: `החוזה "${c.title}" הגיע לסוף תוקפו`,
    body: `שלום ${c.client.name},\n\nהחוזה "${c.title}" הסתיים בתאריך ${end.toLocaleDateString('he-IL')}.\nשמחים להיות שותפים — נא ליצור קשר לחידוש.\n\n${c.provider.name}`,
  });

  return jobs;
}

function renderEmail(opts: {
  clientName: string;
  title: string;
  endDate: Date;
  daysLeft: number;
  renewLink: string;
  provider: string;
}) {
  return [
    `שלום ${opts.clientName},`,
    '',
    `החוזה "${opts.title}" יסתיים בעוד ${opts.daysLeft} ימים, בתאריך ${opts.endDate.toLocaleDateString('he-IL')}.`,
    'נשמח לחדש לתקופה נוספת ולהמשיך לעבוד יחד.',
    '',
    `לחידוש בלחיצה: ${opts.renewLink}`,
    '',
    `בברכה,`,
    opts.provider,
  ].join('\n');
}
