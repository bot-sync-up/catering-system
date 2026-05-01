import { generateBackupCodes, consumeBackupCode } from '../src/2fa/totp';
import { resetConfigCache } from '../src/config';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.AES_KEY_HEX = 'c'.repeat(64);
  process.env.JWT_SECRET = 'z'.repeat(40);
  resetConfigCache();
});

describe('Backup codes', () => {
  test('מייצר 10 קודים שונים', () => {
    const { plain, hashed } = generateBackupCodes(10);
    expect(plain.length).toBe(10);
    expect(hashed.length).toBe(10);
    expect(new Set(plain).size).toBe(10);
  });

  test('צריכת קוד מחק אותו מהרשימה', () => {
    const { plain, hashed } = generateBackupCodes(3);
    const r = consumeBackupCode(hashed, plain[1]);
    expect(r.ok).toBe(true);
    expect(r.remaining.length).toBe(2);
  });

  test('קוד שגוי לא מקובל', () => {
    const { hashed } = generateBackupCodes(3);
    const r = consumeBackupCode(hashed, 'deadbeef00');
    expect(r.ok).toBe(false);
    expect(r.remaining.length).toBe(3);
  });
});
