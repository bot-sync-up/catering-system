import { hashPassword, verifyPassword, isStrongPassword } from '../src/crypto/password';

// argon2 native — נמדל אם לא זמין
jest.mock('argon2', () => ({
  argon2id: 2,
  hash: jest.fn(async (s: string) => `argon2id$mock$${Buffer.from(s).toString('hex')}`),
  verify: jest.fn(async (h: string, s: string) => h.endsWith(Buffer.from(s).toString('hex'))),
}));

describe('Password', () => {
  test('strong password rules', () => {
    expect(isStrongPassword('Aa1!aaaa').ok).toBe(false);    // <10
    expect(isStrongPassword('aaaaaaaaaa').ok).toBe(false);   // no upper/digit/symbol
    expect(isStrongPassword('AAAAAAAAAA').ok).toBe(false);
    expect(isStrongPassword('Aa1!aaaaaa').ok).toBe(true);
  });

  test('hash + verify round-trip', async () => {
    const h = await hashPassword('Aa1!aaaaaa');
    expect(h).toMatch(/^argon2id/);
    expect(await verifyPassword(h, 'Aa1!aaaaaa')).toBe(true);
    expect(await verifyPassword(h, 'wrong')).toBe(false);
  });

  test('empty password rejected', async () => {
    await expect(hashPassword('')).rejects.toThrow();
  });
});
