/**
 * KMS Client — envelope encryption
 * ---------------------------------------------------------------
 * החלפה ל-AES key שהיה hard-coded בקוד.
 *
 * הגישה: Envelope encryption.
 *   1) המפתח-הראשי (KEK) חי ב-KMS / Vault — אף פעם לא יוצא משם.
 *   2) לכל קובץ/שדה אנו מבקשים DEK חדש (Data Encryption Key).
 *   3) שומרים את ה-ciphertext + ה-DEK המוצפן (cipherKey).
 *   4) לפענוח: שולחים את ה-cipherKey ל-KMS, מקבלים DEK, מפענחים.
 *
 * תומך 3 ספקים:
 *   - aws       (AWS KMS)
 *   - gcp       (Google Cloud KMS)
 *   - vault     (HashiCorp Vault Transit engine)
 *
 * שימוש:
 *   const kms = buildKms({ provider: 'aws', keyId: 'arn:aws:kms:...:key/...' });
 *   const sealed = await kms.encrypt(Buffer.from('סודי'));
 *   const plain  = await kms.decrypt(sealed);
 */

import crypto from 'crypto';

/* ----------------------------------------------------------- */
/* Types                                                         */
/* ----------------------------------------------------------- */
export interface SealedData {
  /** Ciphertext מוצפן ב-DEK. base64 */
  ciphertext: string;
  /** DEK מוצפן ב-KEK של KMS. base64 */
  cipherKey: string;
  /** IV בן 12 בייטים (AES-GCM). base64 */
  iv: string;
  /** Authentication tag (16 bytes). base64 */
  authTag: string;
  /** מטא-מידע על המפתח שבשימוש */
  keyId: string;
  algo: 'AES-256-GCM';
  v: 1;
}

export interface KmsClient {
  encrypt(plaintext: Buffer, aad?: Buffer): Promise<SealedData>;
  decrypt(sealed: SealedData, aad?: Buffer): Promise<Buffer>;
  /** ל-rotate: מפענח עם הישן ומצפין מחדש עם החדש */
  reencrypt(sealed: SealedData, aad?: Buffer): Promise<SealedData>;
}

export type KmsProvider = 'aws' | 'gcp' | 'vault';

export interface KmsBuildOptions {
  provider: KmsProvider;
  /** AWS: ARN; GCP: 'projects/.../locations/.../keyRings/.../cryptoKeys/...'; Vault: shorthand name */
  keyId: string;
  /** Vault address (Vault only) */
  vaultAddress?: string;
  /** Vault token (Vault only) */
  vaultToken?: string;
}

/* ----------------------------------------------------------- */
/* Internal AES-GCM helpers                                      */
/* ----------------------------------------------------------- */
function aesGcmEncrypt(plaintext: Buffer, dek: Buffer, aad?: Buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
  if (aad) cipher.setAAD(aad);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { ciphertext: enc, iv, authTag: cipher.getAuthTag() };
}

function aesGcmDecrypt(ciphertext: Buffer, dek: Buffer, iv: Buffer, authTag: Buffer, aad?: Buffer) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
  decipher.setAuthTag(authTag);
  if (aad) decipher.setAAD(aad);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/* ----------------------------------------------------------- */
/* Provider: AWS KMS                                            */
/* ----------------------------------------------------------- */
class AwsKmsClient implements KmsClient {
  private kms: import('@aws-sdk/client-kms').KMSClient;
  constructor(private keyId: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { KMSClient } = require('@aws-sdk/client-kms');
    this.kms = new KMSClient({});
  }

  async encrypt(plaintext: Buffer, aad?: Buffer): Promise<SealedData> {
    const { GenerateDataKeyCommand } = await import('@aws-sdk/client-kms');
    const dataKey = await this.kms.send(
      new GenerateDataKeyCommand({ KeyId: this.keyId, KeySpec: 'AES_256' }),
    );
    const dek = Buffer.from(dataKey.Plaintext as Uint8Array);
    const cipherKey = Buffer.from(dataKey.CiphertextBlob as Uint8Array);

    const { ciphertext, iv, authTag } = aesGcmEncrypt(plaintext, dek, aad);
    dek.fill(0); // wipe plaintext DEK

    return {
      ciphertext: ciphertext.toString('base64'),
      cipherKey: cipherKey.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyId: this.keyId,
      algo: 'AES-256-GCM',
      v: 1,
    };
  }

  async decrypt(sealed: SealedData, aad?: Buffer): Promise<Buffer> {
    const { DecryptCommand } = await import('@aws-sdk/client-kms');
    const decrypted = await this.kms.send(
      new DecryptCommand({
        CiphertextBlob: Buffer.from(sealed.cipherKey, 'base64'),
        KeyId: sealed.keyId,
      }),
    );
    const dek = Buffer.from(decrypted.Plaintext as Uint8Array);
    try {
      return aesGcmDecrypt(
        Buffer.from(sealed.ciphertext, 'base64'),
        dek,
        Buffer.from(sealed.iv, 'base64'),
        Buffer.from(sealed.authTag, 'base64'),
        aad,
      );
    } finally {
      dek.fill(0);
    }
  }

  async reencrypt(sealed: SealedData, aad?: Buffer): Promise<SealedData> {
    const plain = await this.decrypt(sealed, aad);
    try {
      return await this.encrypt(plain, aad);
    } finally {
      plain.fill(0);
    }
  }
}

/* ----------------------------------------------------------- */
/* Provider: GCP KMS                                            */
/* ----------------------------------------------------------- */
class GcpKmsClient implements KmsClient {
  private client: import('@google-cloud/kms').KeyManagementServiceClient;
  constructor(private keyId: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { KeyManagementServiceClient } = require('@google-cloud/kms');
    this.client = new KeyManagementServiceClient();
  }

  async encrypt(plaintext: Buffer, aad?: Buffer): Promise<SealedData> {
    const dek = crypto.randomBytes(32);
    const [resp] = await this.client.encrypt({
      name: this.keyId,
      plaintext: dek,
      additionalAuthenticatedData: aad,
    });

    const { ciphertext, iv, authTag } = aesGcmEncrypt(plaintext, dek, aad);
    dek.fill(0);

    return {
      ciphertext: ciphertext.toString('base64'),
      cipherKey: Buffer.from(resp.ciphertext as Uint8Array).toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyId: this.keyId,
      algo: 'AES-256-GCM',
      v: 1,
    };
  }

  async decrypt(sealed: SealedData, aad?: Buffer): Promise<Buffer> {
    const [resp] = await this.client.decrypt({
      name: sealed.keyId,
      ciphertext: Buffer.from(sealed.cipherKey, 'base64'),
      additionalAuthenticatedData: aad,
    });
    const dek = Buffer.from(resp.plaintext as Uint8Array);
    try {
      return aesGcmDecrypt(
        Buffer.from(sealed.ciphertext, 'base64'),
        dek,
        Buffer.from(sealed.iv, 'base64'),
        Buffer.from(sealed.authTag, 'base64'),
        aad,
      );
    } finally {
      dek.fill(0);
    }
  }

  async reencrypt(sealed: SealedData, aad?: Buffer): Promise<SealedData> {
    const plain = await this.decrypt(sealed, aad);
    try {
      return await this.encrypt(plain, aad);
    } finally {
      plain.fill(0);
    }
  }
}

/* ----------------------------------------------------------- */
/* Provider: HashiCorp Vault Transit                             */
/* ----------------------------------------------------------- */
class VaultKmsClient implements KmsClient {
  private vault: ReturnType<typeof import('node-vault')>;
  constructor(private keyId: string, address?: string, token?: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NodeVault = require('node-vault');
    this.vault = NodeVault({ endpoint: address ?? process.env.VAULT_ADDR, token: token ?? process.env.VAULT_TOKEN });
  }

  async encrypt(plaintext: Buffer, aad?: Buffer): Promise<SealedData> {
    const dek = crypto.randomBytes(32);
    const wrapped = await this.vault.write(`transit/encrypt/${this.keyId}`, {
      plaintext: dek.toString('base64'),
      context: aad ? aad.toString('base64') : undefined,
    });

    const { ciphertext, iv, authTag } = aesGcmEncrypt(plaintext, dek, aad);
    dek.fill(0);

    return {
      ciphertext: ciphertext.toString('base64'),
      cipherKey: wrapped.data.ciphertext, // 'vault:v1:...'
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyId: this.keyId,
      algo: 'AES-256-GCM',
      v: 1,
    };
  }

  async decrypt(sealed: SealedData, aad?: Buffer): Promise<Buffer> {
    const unwrapped = await this.vault.write(`transit/decrypt/${sealed.keyId}`, {
      ciphertext: sealed.cipherKey,
      context: aad ? aad.toString('base64') : undefined,
    });
    const dek = Buffer.from(unwrapped.data.plaintext, 'base64');
    try {
      return aesGcmDecrypt(
        Buffer.from(sealed.ciphertext, 'base64'),
        dek,
        Buffer.from(sealed.iv, 'base64'),
        Buffer.from(sealed.authTag, 'base64'),
        aad,
      );
    } finally {
      dek.fill(0);
    }
  }

  async reencrypt(sealed: SealedData, aad?: Buffer): Promise<SealedData> {
    const plain = await this.decrypt(sealed, aad);
    try {
      return await this.encrypt(plain, aad);
    } finally {
      plain.fill(0);
    }
  }
}

/* ----------------------------------------------------------- */
/* Factory                                                      */
/* ----------------------------------------------------------- */
export function buildKms(opts: KmsBuildOptions): KmsClient {
  switch (opts.provider) {
    case 'aws':
      return new AwsKmsClient(opts.keyId);
    case 'gcp':
      return new GcpKmsClient(opts.keyId);
    case 'vault':
      return new VaultKmsClient(opts.keyId, opts.vaultAddress, opts.vaultToken);
    default:
      throw new Error(`KMS provider לא נתמך: ${opts.provider as string}`);
  }
}
