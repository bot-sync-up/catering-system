import { describe, it, expect } from 'vitest';
import { assertStrongSecret, generateSecret, loadJwtConfigFromEnv, issueAccessToken, verifyAccessToken, issueRefreshToken, verifyRefreshToken } from '../src/index';

describe('jwt config', () => {
  it('זורק על secret חלש', () => {
    expect(() => assertStrongSecret('X', 'secret')).toThrow();
    expect(() => assertStrongSecret('X', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toThrow(/entropy/);
    expect(() => assertStrongSecret('X', '')).toThrow();
  });

  it('מקבל secret חזק', () => {
    expect(() => assertStrongSecret('X', generateSecret())).not.toThrow();
  });

  it('generateSecret יוצר מחרוזת ייחודית באורך > 40', () => {
    const a = generateSecret();
    const b = generateSecret();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(40);
  });

  it('loadJwtConfigFromEnv זורק כשחסר', () => {
    expect(() => loadJwtConfigFromEnv({})).toThrow();
  });

  it('loadJwtConfigFromEnv זורק כשsecrets זהים', () => {
    const s = generateSecret();
    expect(() => loadJwtConfigFromEnv({
      JWT_ACCESS_SECRET: s,
      JWT_REFRESH_SECRET: s,
      JWT_ISSUER: 'x', JWT_AUDIENCE: 'y',
    } as any)).toThrow();
  });

  it('access token TTL ברירת מחדל 15 דקות', () => {
    const cfg = loadJwtConfigFromEnv({
      JWT_ACCESS_SECRET: generateSecret(),
      JWT_REFRESH_SECRET: generateSecret(),
      JWT_ISSUER: 'x', JWT_AUDIENCE: 'y',
    } as any);
    expect(cfg.accessTtlSeconds).toBe(900);
  });

  it('issue + verify access token עובד', () => {
    const cfg = loadJwtConfigFromEnv({
      JWT_ACCESS_SECRET: generateSecret(),
      JWT_REFRESH_SECRET: generateSecret(),
      JWT_ISSUER: 'iss', JWT_AUDIENCE: 'aud',
    } as any);
    const tok = issueAccessToken(cfg, 'user-1', ['admin']);
    const p = verifyAccessToken(cfg, tok);
    expect(p.sub).toBe('user-1');
    expect(p.roles).toEqual(['admin']);
  });

  it('verifyAccessToken זורק על טוקן מזויף', () => {
    const cfg = loadJwtConfigFromEnv({
      JWT_ACCESS_SECRET: generateSecret(),
      JWT_REFRESH_SECRET: generateSecret(),
      JWT_ISSUER: 'iss', JWT_AUDIENCE: 'aud',
    } as any);
    expect(() => verifyAccessToken(cfg, 'abc.def.ghi')).toThrow();
  });

  it('refresh token יוצא ומאומת', () => {
    const cfg = loadJwtConfigFromEnv({
      JWT_ACCESS_SECRET: generateSecret(),
      JWT_REFRESH_SECRET: generateSecret(),
      JWT_ISSUER: 'iss', JWT_AUDIENCE: 'aud',
    } as any);
    const { token, jti } = issueRefreshToken(cfg, 'u');
    const v = verifyRefreshToken(cfg, token);
    expect(v.sub).toBe('u');
    expect(v.jti).toBe(jti);
  });
});
