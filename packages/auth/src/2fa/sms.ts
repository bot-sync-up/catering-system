/**
 * 2FA SMS — שליחת קוד 6-ספרות, אחסון hashed ב-Redis עם TTL
 */
import * as crypto from 'crypto';
import { getRedis } from '../session/store';
import { loadConfig } from '../config';

const OTP_TTL_SEC = 300;   // 5 דקות
const OTP_LEN = 6;

const otpKey = (userId: string) => `sms-otp:${userId}`;

export interface SmsSender {
  send(phone: string, body: string): Promise<void>;
}

export class TwilioSender implements SmsSender {
  async send(phone: string, body: string): Promise<void> {
    const cfg = loadConfig();
    if (!cfg.TWILIO_ACCOUNT_SID || !cfg.TWILIO_AUTH_TOKEN || !cfg.TWILIO_FROM) {
      throw new Error('Twilio not configured');
    }
    // טעינה דינמית כדי לא לדרוש את החבילה ב-test
    const twilio = (await import('twilio')).default;
    const client = twilio(cfg.TWILIO_ACCOUNT_SID, cfg.TWILIO_AUTH_TOKEN);
    await client.messages.create({ from: cfg.TWILIO_FROM, to: phone, body });
  }
}

export class NoopSender implements SmsSender {
  public sent: { phone: string; body: string }[] = [];
  async send(phone: string, body: string): Promise<void> {
    this.sent.push({ phone, body });
  }
}

function genCode(): string {
  // 6 ספרות אקראיות מאובטחות
  const n = crypto.randomInt(0, 10 ** OTP_LEN);
  return n.toString().padStart(OTP_LEN, '0');
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function issueSmsOtp(
  userId: string,
  phone: string,
  sender: SmsSender
): Promise<void> {
  const code = genCode();
  const r = getRedis();
  await r.set(otpKey(userId), hashCode(code), 'EX', OTP_TTL_SEC);
  await sender.send(phone, `קוד האימות שלך: ${code}\nתוקף: 5 דקות`);
}

export async function verifySmsOtp(userId: string, code: string): Promise<boolean> {
  const r = getRedis();
  const stored = await r.get(otpKey(userId));
  if (!stored) return false;
  const submitted = hashCode(code.trim());
  if (stored.length !== submitted.length) return false;
  const ok = crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(submitted));
  if (ok) await r.del(otpKey(userId));
  return ok;
}
