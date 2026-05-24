/**
 * KMS Client — אבסטרקציה מעל AWS KMS / Vault Transit / GCP KMS.
 *
 * עיקרון envelope encryption:
 *   1. ה-KMS מחזיק Master Key שאינו עוזב אותו.
 *   2. עבור כל ערך אנו מבקשים DataKey (plaintext + ciphertext).
 *   3. מצפינים את הערך עם ה-DataKey (AES-256-GCM).
 *   4. שומרים את ה-ciphertext של ה-DataKey + nonce + tag + ciphertext.
 *
 * המפתח האמיתי לעולם לא נשמר במאגר שלנו.
 */
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { z } from 'zod';

export const EncryptedEnvelopeSchema = z.object({
  v: z.literal(1),
  keyId: z.string(),
  encryptedDataKey: z.string(),
  iv: z.string(),
  tag: z.string(),
  ciphertext: z.string(),
});

export type EncryptedEnvelope = z.infer<typeof EncryptedEnvelopeSchema>;

export interface KmsBackend {
  /** מזהה ה-master key */
  readonly keyId: string;
  /** מייצר DataKey חדש */
  generateDataKey(): Promise<{ plaintext: Buffer; ciphertext: Buffer }>;
  /** פותח DataKey מוצפן ל-plaintext */
  decryptDataKey(ciphertext: Buffer): Promise<Buffer>;
}

/**
 * הצפנת ערך באמצעות envelope encryption.
 */
export async function encryptWithEnvelope(
  plaintext: Buffer | string,
  kms: KmsBackend,
): Promise<EncryptedEnvelope> {
  const data = typeof plaintext === 'string' ? Buffer.from(plaintext, 'utf8') : plaintext;
  const { plaintext: dataKey, ciphertext: encryptedDataKey } = await kms.generateDataKey();
  if (dataKey.length !== 32) throw new Error('DataKey חייב להיות 32 בייטים (AES-256)');

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', dataKey, iv);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();

  // איפוס DataKey מהזיכרון
  dataKey.fill(0);

  return {
    v: 1,
    keyId: kms.keyId,
    encryptedDataKey: encryptedDataKey.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

export async function decryptEnvelope(
  envelope: EncryptedEnvelope,
  kms: KmsBackend,
): Promise<Buffer> {
  const parsed = EncryptedEnvelopeSchema.parse(envelope);
  if (parsed.keyId !== kms.keyId) {
    throw new Error(`keyId לא תואם: ${parsed.keyId} != ${kms.keyId}`);
  }
  const dataKey = await kms.decryptDataKey(Buffer.from(parsed.encryptedDataKey, 'base64'));
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      dataKey,
      Buffer.from(parsed.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(parsed.ciphertext, 'base64')),
      decipher.final(),
    ]);
  } finally {
    dataKey.fill(0);
  }
}

/**
 * Backend לפיתוח בלבד — מחזיק master key בזיכרון.
 * אסור לשימוש בייצור!
 */
export class InMemoryKmsBackend implements KmsBackend {
  readonly keyId: string;
  private master: Buffer;
  constructor(keyId: string = 'dev-master') {
    this.keyId = keyId;
    this.master = randomBytes(32);
  }
  async generateDataKey(): Promise<{ plaintext: Buffer; ciphertext: Buffer }> {
    const dataKey = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.master, iv);
    const enc = Buffer.concat([cipher.update(dataKey), cipher.final()]);
    const tag = cipher.getAuthTag();
    // ciphertext = iv | tag | enc
    return { plaintext: dataKey, ciphertext: Buffer.concat([iv, tag, enc]) };
  }
  async decryptDataKey(ciphertext: Buffer): Promise<Buffer> {
    const iv = ciphertext.subarray(0, 12);
    const tag = ciphertext.subarray(12, 28);
    const enc = ciphertext.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.master, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]);
  }
}

/**
 * Stubs עבור AWS KMS / Vault — לימדנו ב-prod להחליף ב-SDK אמיתי.
 */
export interface AwsKmsConfig {
  region: string;
  keyId: string; // arn או alias
}

export function awsKmsBackend(_cfg: AwsKmsConfig): KmsBackend {
  throw new Error('להתקין @aws-sdk/client-kms ולחבר ב-prod. ראה SECURITY-RUNBOOK.md');
}

export interface VaultConfig {
  baseUrl: string;
  token: string;
  transitKey: string;
}

export function vaultTransitBackend(_cfg: VaultConfig): KmsBackend {
  throw new Error('להתקין node-vault ולחבר ב-prod. ראה SECURITY-RUNBOOK.md');
}
