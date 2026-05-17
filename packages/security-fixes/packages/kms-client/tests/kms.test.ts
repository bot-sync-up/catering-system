import { describe, it, expect } from 'vitest';
import { encryptWithEnvelope, decryptEnvelope, InMemoryKmsBackend } from '../src/index';

describe('KMS envelope', () => {
  it('encrypt + decrypt round-trip', async () => {
    const kms = new InMemoryKmsBackend();
    const env = await encryptWithEnvelope('סוד מדינה', kms);
    expect(env.ciphertext).not.toContain('סוד');
    const out = await decryptEnvelope(env, kms);
    expect(out.toString('utf8')).toBe('סוד מדינה');
  });

  it('שינוי ב-ciphertext גורם לכישלון', async () => {
    const kms = new InMemoryKmsBackend();
    const env = await encryptWithEnvelope('hello', kms);
    const tampered = {
      ...env,
      ciphertext: Buffer.from('aaaaaaaaaa', 'utf8').toString('base64'),
    };
    await expect(decryptEnvelope(tampered, kms)).rejects.toThrow();
  });

  it('keyId לא תואם זורק', async () => {
    const kms1 = new InMemoryKmsBackend('k1');
    const kms2 = new InMemoryKmsBackend('k2');
    const env = await encryptWithEnvelope('x', kms1);
    await expect(decryptEnvelope(env, kms2)).rejects.toThrow(/keyId/);
  });

  it('envelope מכיל ערכי base64', async () => {
    const kms = new InMemoryKmsBackend();
    const env = await encryptWithEnvelope('payload', kms);
    expect(env.iv).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(env.tag).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(env.v).toBe(1);
  });
});
