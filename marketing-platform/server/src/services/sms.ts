import axios from 'axios';
import twilio from 'twilio';
import { env } from '../lib/env.js';
import { logger } from '../lib/logger.js';

export interface SmsPayload {
  to: string;
  body: string;
}

/** Send SMS via 019 (Israeli provider) with Twilio as automatic fallback. */
export async function sendSms(p: SmsPayload): Promise<{ id: string; provider: string }> {
  // Try 019 first
  if (env.SMS_019_USER && env.SMS_019_PASSWORD) {
    try {
      const id = await send019(p);
      return { id, provider: '019' };
    } catch (err) {
      logger.warn('019 SMS failed — trying Twilio', err);
    }
  }

  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM) {
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    const msg = await client.messages.create({
      to: normalize(p.to),
      from: env.TWILIO_FROM,
      body: p.body,
    });
    return { id: msg.sid, provider: 'twilio' };
  }

  logger.warn('No SMS provider configured — simulated', { to: p.to });
  return { id: `simulated-${Date.now()}`, provider: 'simulated' };
}

async function send019(p: SmsPayload): Promise<string> {
  // 019 supports REST/SOAP. Using their REST-like SMS API.
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<sms>
  <user>
    <username>${env.SMS_019_USER}</username>
    <password>${env.SMS_019_PASSWORD}</password>
  </user>
  <source>${env.SMS_019_SOURCE}</source>
  <destinations>
    <phone>${normalize(p.to)}</phone>
  </destinations>
  <message>${escapeXml(p.body)}</message>
</sms>`;
  const res = await axios.post('https://www.019sms.co.il/api', xml, {
    headers: { 'Content-Type': 'application/xml' },
    timeout: 15_000,
  });
  // Their response contains a status code in XML — minimal parse
  const match = /<status>(\d+)<\/status>/.exec(res.data ?? '');
  const status = match?.[1];
  if (status && status !== '0') throw new Error(`019 error status ${status}`);
  return `019-${Date.now()}`;
}

function normalize(phone: string): string {
  // Convert 05xxxxxxxx → +9725xxxxxxxx, keep already-international as-is
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('972')) return `+${digits}`;
  if (digits.startsWith('0')) return `+972${digits.slice(1)}`;
  if (phone.startsWith('+')) return phone;
  return `+${digits}`;
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c] ?? c));
}
