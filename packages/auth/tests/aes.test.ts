import { encryptField, decryptField } from '../src/crypto/aes';
import { resetConfigCache } from '../src/config';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.AES_KEY_HEX = 'a'.repeat(64);
  process.env.JWT_SECRET = 'x'.repeat(40);
  resetConfigCache();
});

describe('AES-256-GCM field encryption', () => {
  test('round-trip', () => {
    const plain = 'IL12-3456-7890-1234';
    const enc = encryptField(plain);
    expect(enc).not.toBe(plain);
    expect(enc).not.toBeNull();
    const dec = decryptField(enc);
    expect(dec).toBe(plain);
  });

  test('null/empty passthrough', () => {
    expect(encryptField(null)).toBeNull();
    expect(encryptField('')).toBeNull();
    expect(decryptField(null)).toBeNull();
  });

  test('tamper detected', () => {
    const enc = encryptField('secret-salary')!;
    // משחית בייט אחד
    const buf = Buffer.from(enc, 'base64');
    buf[buf.length - 1] ^= 0xff;
    const tampered = buf.toString('base64');
    expect(() => decryptField(tampered)).toThrow();
  });

  test('different ciphertexts each call (random IV)', () => {
    const a = encryptField('same');
    const b = encryptField('same');
    expect(a).not.toBe(b);
  });
});
