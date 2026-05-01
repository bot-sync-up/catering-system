/**
 * 2FA — TOTP (RFC 6238) + QR + backup codes
 */
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { encryptField, decryptField } from '../crypto/aes';
import { loadConfig } from '../config';

authenticator.options = { window: 1, step: 30, digits: 6 };

export interface TotpSetup {
  secret: string;          // plain — לשמור מוצפן
  encSecret: string;       // מוצפן לשמירה ב-DB
  otpauthUrl: string;
  qrDataUrl: string;
}

export async function generateTotpSetup(userEmail: string): Promise<TotpSetup> {
  const cfg = loadConfig();
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(userEmail, cfg.APP_NAME, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
  return {
    secret,
    encSecret: encryptField(secret)!,
    otpauthUrl,
    qrDataUrl,
  };
}

export function verifyTotp(encSecret: string, code: string): boolean {
  const secret = decryptField(encSecret);
  if (!secret) return false;
  return authenticator.check(code, secret);
}

export function generateBackupCodes(n = 10): { plain: string[]; hashed: string[] } {
  const plain: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < n; i++) {
    const code = crypto.randomBytes(5).toString('hex'); // 10 hex
    plain.push(code);
    hashed.push(crypto.createHash('sha256').update(code).digest('hex'));
  }
  return { plain, hashed };
}

export function consumeBackupCode(hashedList: string[], submitted: string): { ok: boolean; remaining: string[] } {
  const h = crypto.createHash('sha256').update(submitted.trim().toLowerCase()).digest('hex');
  const idx = hashedList.indexOf(h);
  if (idx === -1) return { ok: false, remaining: hashedList };
  const remaining = [...hashedList.slice(0, idx), ...hashedList.slice(idx + 1)];
  return { ok: true, remaining };
}
