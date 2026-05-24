import axios from 'axios';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

const WA_API = 'https://graph.facebook.com/v21.0';

export interface WaTextPayload {
  to: string;
  body: string;
}

export interface WaTemplatePayload {
  to: string;
  template: string;
  language?: string;
  components?: any[];
}

/** Send free-form WhatsApp text message (only within 24h customer-care window). */
export async function sendWaText(p: WaTextPayload): Promise<{ id: string }> {
  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_ID) {
    logger.warn('WhatsApp not configured — simulated', { to: p.to });
    return { id: `simulated-${Date.now()}` };
  }
  const url = `${WA_API}/${env.WHATSAPP_PHONE_ID}/messages`;
  const res = await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      to: normalize(p.to),
      type: 'text',
      text: { body: p.body, preview_url: true },
    },
    { headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` }, timeout: 15_000 }
  );
  return { id: res.data.messages?.[0]?.id ?? `wa-${Date.now()}` };
}

/** Send WhatsApp template (required for outbound outside 24h window). */
export async function sendWaTemplate(p: WaTemplatePayload): Promise<{ id: string }> {
  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_ID) {
    logger.warn('WhatsApp not configured — simulated', { to: p.to });
    return { id: `simulated-${Date.now()}` };
  }
  const url = `${WA_API}/${env.WHATSAPP_PHONE_ID}/messages`;
  const res = await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      to: normalize(p.to),
      type: 'template',
      template: {
        name: p.template,
        language: { code: p.language ?? 'he' },
        components: p.components ?? [],
      },
    },
    { headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` }, timeout: 15_000 }
  );
  return { id: res.data.messages?.[0]?.id ?? `wa-${Date.now()}` };
}

function normalize(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return `972${digits.slice(1)}`;
  return digits;
}
