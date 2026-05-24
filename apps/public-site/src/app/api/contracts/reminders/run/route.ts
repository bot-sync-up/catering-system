import { NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/db';
import type { ReminderJob } from '@contracts/core';

export const runtime = 'nodejs';

/**
 * Cron endpoint — invoke from your scheduler (Vercel Cron, GitHub Actions, etc.)
 * with header `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (expected && auth !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const all = await readJson<ReminderJob[]>('reminders.json', []);
  const now = Date.now();
  const due = all.filter((j) => new Date(j.fireAt).getTime() <= now);
  const remaining = all.filter((j) => new Date(j.fireAt).getTime() > now);

  for (const job of due) {
    await dispatchEmail(job);
  }

  await writeJson('reminders.json', remaining);
  return NextResponse.json({ processed: due.length, pending: remaining.length });
}

async function dispatchEmail(job: ReminderJob) {
  const url = process.env.MAIL_WEBHOOK_URL;
  if (!url) {
    console.log('[reminder]', job.to, job.subject);
    return;
  }
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.MAIL_WEBHOOK_TOKEN && { Authorization: `Bearer ${process.env.MAIL_WEBHOOK_TOKEN}` }),
      },
      body: JSON.stringify({ to: job.to, subject: job.subject, text: job.body }),
    });
  } catch (err) {
    console.error('reminder dispatch failed', err);
  }
}
