import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { renderTemplate, rtlEmailWrap } from './templating.js';
import { sendEmail } from './email.js';
import { sendSms } from './sms.js';
import { sendWaText, sendWaTemplate } from './whatsapp.js';
import { env } from '../lib/env.js';

interface SendOpts {
  leadId: string;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
  templateId?: string;
  campaignId?: string;
  variantId?: string;
  variables?: Record<string, any>;
}

/** Send a templated message to a lead, recording the MessageSend row. */
export async function sendToLead(opts: SendOpts) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: opts.leadId } });
  const template = opts.templateId
    ? await prisma.template.findUniqueOrThrow({ where: { id: opts.templateId } })
    : null;

  const vars = { ...(lead.attributes as any), ...opts.variables, lead };
  const bodyRaw = template ? renderTemplate(template.body, vars) : (opts.variables?.body ?? '');
  const subject = template?.subject ? renderTemplate(template.subject, vars) : opts.variables?.subject ?? '';

  // Check consent
  if (opts.channel === 'EMAIL' && !lead.consentEmail) throw new Error('No email consent');
  if (opts.channel === 'SMS' && !lead.consentSms) throw new Error('No SMS consent');
  if (opts.channel === 'WHATSAPP' && !lead.consentWa) throw new Error('No WA consent');

  const recipient =
    opts.channel === 'EMAIL' ? lead.email :
    opts.channel === 'SMS' || opts.channel === 'WHATSAPP' ? lead.phone : null;

  if (!recipient) throw new Error(`Missing recipient for channel ${opts.channel}`);

  const send = await prisma.messageSend.create({
    data: {
      leadId: lead.id,
      campaignId: opts.campaignId,
      variantId: opts.variantId,
      channel: opts.channel,
      to: recipient,
      subject: subject || undefined,
      body: bodyRaw,
      status: 'QUEUED',
    },
  });

  try {
    let providerId: string;
    if (opts.channel === 'EMAIL') {
      const html = rtlEmailWrap(subject, bodyRaw);
      const unsubUrl = `${env.PUBLIC_BASE_URL}/api/track/unsub/${send.id}`;
      const r = await sendEmail({
        to: recipient,
        subject,
        html,
        trackingId: send.id,
        unsubscribeUrl: unsubUrl,
      });
      providerId = r.id;
    } else if (opts.channel === 'SMS') {
      const r = await sendSms({ to: recipient, body: bodyRaw });
      providerId = r.id;
    } else if (opts.channel === 'WHATSAPP') {
      // Try free-form first; fall back to template name if env says so
      try {
        const r = await sendWaText({ to: recipient, body: bodyRaw });
        providerId = r.id;
      } catch {
        const r = await sendWaTemplate({ to: recipient, template: template?.name ?? 'generic', language: 'he' });
        providerId = r.id;
      }
    } else {
      throw new Error('Unsupported channel');
    }

    await prisma.messageSend.update({
      where: { id: send.id },
      data: { status: 'SENT', sentAt: new Date(), providerMessageId: providerId },
    });
    return { sendId: send.id, providerId };
  } catch (err: any) {
    logger.error('send failed', { sendId: send.id, err: err.message });
    await prisma.messageSend.update({
      where: { id: send.id },
      data: { status: 'FAILED', errorMessage: err.message },
    });
    throw err;
  }
}
