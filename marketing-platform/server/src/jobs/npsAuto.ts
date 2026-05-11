import { prisma } from '../lib/prisma.js';
import { sendToLead } from '../services/sender.js';
import { env } from '../lib/env.js';

/**
 * Auto-send NPS surveys based on trigger event types.
 * Reads active surveys; for each, find leads with the trigger event in the last N minutes
 * who haven't responded yet, and send.
 */
export async function runNpsAutoTick() {
  const surveys = await prisma.survey.findMany({ where: { active: true, type: 'NPS' } });
  for (const s of surveys) {
    const trig = (s.trigger as any) ?? {};
    const eventType: string = trig.event;
    const delayMinutes: number = trig.delayMinutes ?? 60;
    if (!eventType) continue;

    const windowStart = new Date(Date.now() - (delayMinutes + 15) * 60_000);
    const windowEnd = new Date(Date.now() - delayMinutes * 60_000);

    const events = await prisma.leadEvent.findMany({
      where: { type: eventType, createdAt: { gte: windowStart, lte: windowEnd } },
    });

    for (const ev of events) {
      const already = await prisma.surveyResponse.findFirst({
        where: { surveyId: s.id, leadId: ev.leadId },
      });
      if (already) continue;

      // Build a one-off send for the survey question
      const link = `${env.PUBLIC_BASE_URL}/survey/${s.id}?lead=${ev.leadId}`;
      const text = `${s.question}\n${link}`;
      try {
        await sendToLead({
          leadId: ev.leadId,
          channel: s.channel,
          variables: { subject: 'איך היה? נשמח לשמוע', body: text },
        });
      } catch {/* ignore consent / send errors */}
    }
  }
}
