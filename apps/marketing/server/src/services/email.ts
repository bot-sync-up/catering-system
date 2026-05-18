import sgMail from '@sendgrid/mail';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

if (env.SENDGRID_API_KEY) sgMail.setApiKey(env.SENDGRID_API_KEY);

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  trackingId?: string;
  unsubscribeUrl?: string;
}

export async function sendEmail(p: EmailPayload): Promise<{ id: string }> {
  if (!env.SENDGRID_API_KEY) {
    logger.warn('SENDGRID_API_KEY missing — email simulated', { to: p.to });
    return { id: `simulated-${Date.now()}` };
  }
  const html = wrapTrackingPixels(p.html, p.trackingId, p.unsubscribeUrl);
  const [res] = await sgMail.send({
    to: p.to,
    from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
    subject: p.subject,
    html,
    text: p.text ?? stripHtml(p.html),
    trackingSettings: {
      clickTracking: { enable: true, enableText: false },
      openTracking: { enable: true },
    },
    customArgs: p.trackingId ? { sendId: p.trackingId } : undefined,
  });
  const messageId = res.headers['x-message-id'] as string | undefined;
  return { id: messageId ?? `sg-${Date.now()}` };
}

function wrapTrackingPixels(html: string, trackingId?: string, unsub?: string) {
  let out = html;
  if (trackingId) {
    const pixel = `<img src="${env_base()}/api/track/open/${trackingId}.gif" width="1" height="1" style="display:none" alt="" />`;
    out += pixel;
    // Rewrite href links to go through redirect
    out = out.replace(/href="(https?:\/\/[^"]+)"/g, (_m, url) => {
      const encoded = Buffer.from(url).toString('base64url');
      return `href="${env_base()}/api/track/click/${trackingId}/${encoded}"`;
    });
  }
  if (unsub) {
    out += `<div dir="rtl" style="text-align:center;font-size:12px;color:#888;margin-top:24px;font-family:Arial,sans-serif;">
      <a href="${unsub}" style="color:#888;">להסרה מרשימת התפוצה</a>
    </div>`;
  }
  return out;
}

function env_base() {
  return process.env.PUBLIC_BASE_URL ?? 'http://localhost:4000';
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, '').trim();
}
