/**
 * AES-256-GCM לשדות רגישים (שכר, חשבון בנק, ת"ז)
 * פורמט: base64(iv || ciphertext || tag)
 */
import * as crypto from 'crypto';
import { loadConfig } from '../config';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const cfg = loadConfig();
  return Buffer.from(cfg.AES_KEY_HEX, 'hex');
}

export function encryptField(plain: string | null | undefined): string | null {
  if (plain == null || plain === '') return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString('base64');
}

export function decryptField(payload: string | null | undefined): string | null {
  if (!payload) return null;
  const key = getKey();
  const buf = Buffer.from(payload, 'base64');
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error('Invalid AES payload: too short');
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const enc = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

/** עוטף שדות מסומנים אוטומטית */
export const SENSITIVE_FIELDS = ['salary', 'bankAccount', 'nationalId', 'totpSecret'] as const;

export type SensitiveField = (typeof SENSITIVE_FIELDS)[number];
