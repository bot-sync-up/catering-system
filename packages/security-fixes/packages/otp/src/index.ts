/**
 * OTP — One-Time Password מאובטח.
 *
 * חוק: אסור להשתמש ב-Math.random לסודות. חייבים crypto.randomInt.
 * Math.random של V8 ניתן לחזות לאחר ~512 דגימות.
 *
 * נוסף: השוואה ב-timingSafeEqual למניעת timing attack,
 *       rate-limiting (5 ניסיונות + lockout), TTL של 5 דקות.
 */
import { randomInt, createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const OtpRecordSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string(),
  codeHash: z.string(),
  channel: z.enum(['sms', 'email', 'whatsapp']),
  createdAt: z.date(),
  expiresAt: z.date(),
  attempts: z.number().int().nonnegative().default(0),
  used: z.boolean().default(false),
  lockedUntil: z.date().nullable().default(null),
});

export type OtpRecord = z.infer<typeof OtpRecordSchema>;

const MAX_ATTEMPTS = 5;
const LOCKOUT_MIN = 15;
const TTL_MIN = 5;
const SALT = process.env.OTP_HASH_SALT || 'otp-pepper-set-via-env-please';

/**
 * מייצר קוד 6-ספרות מאובטח.
 * crypto.randomInt(100000, 1000000) מבטיח 6 ספרות מלאות (לא פותח באפסים).
 */
export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

function hashCode(code: string, subjectId: string): string {
  return createHash('sha256').update(`${SALT}::${subjectId}::${code}`).digest('hex');
}

export interface OtpStore {
  save(record: OtpRecord): Promise<void>;
  findActive(subjectId: string): Promise<OtpRecord | null>;
  update(id: string, patch: Partial<OtpRecord>): Promise<void>;
}

export interface OtpSender {
  send(channel: OtpRecord['channel'], destination: string, code: string): Promise<void>;
}

export async function requestOtp(
  subjectId: string,
  destination: string,
  channel: OtpRecord['channel'],
  store: OtpStore,
  sender: OtpSender,
  now: Date = new Date(),
): Promise<{ id: string; expiresAt: Date }> {
  const code = generateOtpCode();
  const expiresAt = new Date(now.getTime() + TTL_MIN * 60_000);
  const record: OtpRecord = {
    id: crypto.randomUUID(),
    subjectId,
    codeHash: hashCode(code, subjectId),
    channel,
    createdAt: now,
    expiresAt,
    attempts: 0,
    used: false,
    lockedUntil: null,
  };
  await store.save(record);
  await sender.send(channel, destination, code);
  return { id: record.id, expiresAt };
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'expired' | 'used' | 'locked' | 'incorrect'; remainingAttempts?: number };

export async function verifyOtp(
  subjectId: string,
  code: string,
  store: OtpStore,
  now: Date = new Date(),
): Promise<OtpVerifyResult> {
  const record = await store.findActive(subjectId);
  if (!record) return { ok: false, reason: 'not_found' };
  if (record.used) return { ok: false, reason: 'used' };
  if (record.lockedUntil && record.lockedUntil > now) return { ok: false, reason: 'locked' };
  if (record.expiresAt < now) return { ok: false, reason: 'expired' };

  const provided = Buffer.from(hashCode(code, subjectId), 'hex');
  const expected = Buffer.from(record.codeHash, 'hex');
  const matches = provided.length === expected.length && timingSafeEqual(provided, expected);

  if (matches) {
    await store.update(record.id, { used: true });
    return { ok: true };
  }

  const attempts = record.attempts + 1;
  const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + LOCKOUT_MIN * 60_000) : null;
  await store.update(record.id, { attempts, lockedUntil });
  return {
    ok: false,
    reason: lockedUntil ? 'locked' : 'incorrect',
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - attempts),
  };
}

/**
 * רוץ ב-CI / pre-commit לוודא שאף קוד לא משתמש ב-Math.random.
 * מחזיר מערך עבירות.
 */
export function detectMathRandomUsage(filenames: Map<string, string>): Array<{ file: string; line: number }> {
  const violations: Array<{ file: string; line: number }> = [];
  for (const [file, content] of filenames) {
    const lines = content.split('\n');
    lines.forEach((ln, i) => {
      if (/\bMath\.random\s*\(/.test(ln)) violations.push({ file, line: i + 1 });
    });
  }
  return violations;
}
