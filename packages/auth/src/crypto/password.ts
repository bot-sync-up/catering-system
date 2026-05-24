/**
 * Password hashing with Argon2id
 * עומד בהמלצות OWASP 2024 — m=64MB, t=3, p=4
 */
import * as argon2 from 'argon2';
import { loadConfig } from '../config';

export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const cfg = loadConfig();
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: cfg.ARGON2_MEMORY_COST,
    timeCost: cfg.ARGON2_TIME_COST,
    parallelism: cfg.ARGON2_PARALLELISM,
  });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  if (!hash || !plain) return false;
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/**
 * חוזק סיסמה בסיסי. true אם תקינה.
 * דרישות: ≥10 תווים, אות גדולה, אות קטנה, ספרה, סימן.
 */
export function isStrongPassword(plain: string): { ok: boolean; reason?: string } {
  if (plain.length < 10) return { ok: false, reason: 'נדרשים לפחות 10 תווים' };
  if (!/[A-Z]/.test(plain)) return { ok: false, reason: 'נדרשת אות לטינית גדולה' };
  if (!/[a-z]/.test(plain)) return { ok: false, reason: 'נדרשת אות לטינית קטנה' };
  if (!/\d/.test(plain)) return { ok: false, reason: 'נדרשת ספרה' };
  if (!/[^A-Za-z0-9]/.test(plain)) return { ok: false, reason: 'נדרש תו מיוחד' };
  return { ok: true };
}
