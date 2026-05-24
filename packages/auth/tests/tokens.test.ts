import { signAccess, signRefresh, verifyToken } from '../src/crypto/tokens';
import { resetConfigCache } from '../src/config';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.AES_KEY_HEX = 'b'.repeat(64);
  process.env.JWT_SECRET = 'y'.repeat(40);
  resetConfigCache();
});

describe('JWT tokens', () => {
  test('access token round-trip', () => {
    const t = signAccess({ sub: 'u1', sid: 's1', roles: ['agent'], twoFa: true });
    const p = verifyToken(t, 'access');
    expect(p.sub).toBe('u1');
    expect(p.type).toBe('access');
  });

  test('refresh token rejects when verified as access', () => {
    const t = signRefresh({ sub: 'u1', sid: 's1', roles: [], twoFa: false });
    expect(() => verifyToken(t, 'access')).toThrow();
  });
});
