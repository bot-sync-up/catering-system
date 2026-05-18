import { describe, it, expect } from 'vitest';
import { buildSetCookie, auditCookieHeader, COOKIE_PROFILES } from '../src/index';

describe('cookies', () => {
  it('בונה Set-Cookie מאובטחת עם ברירות מחדל', () => {
    const h = buildSetCookie('session', 'abc123');
    expect(h).toContain('__Host-session=abc123');
    expect(h).toContain('Secure');
    expect(h).toContain('HttpOnly');
    expect(h).toContain('SameSite=Strict');
    expect(h).toContain('Path=/');
  });

  it('SameSite=None ללא Secure זורק', () => {
    expect(() => buildSetCookie('x', 'y', { sameSite: 'None', secure: false })).toThrow();
  });

  it('מסרב לערך עם CRLF', () => {
    expect(() => buildSetCookie('x', 'a\r\nb')).toThrow();
  });

  it('פרופיל session', () => {
    const h = buildSetCookie('auth', 'token', COOKIE_PROFILES.session);
    expect(h).toContain('Max-Age=900');
    expect(h).toContain('Secure');
    expect(h).toContain('HttpOnly');
  });

  it('פרופיל csrf לא HttpOnly', () => {
    const h = buildSetCookie('csrf', 'token', COOKIE_PROFILES.csrf);
    expect(h).not.toContain('HttpOnly');
    expect(h).toContain('Secure');
  });

  it('auditCookieHeader מזהה חוסר Secure', () => {
    const a = auditCookieHeader('foo=bar; HttpOnly; SameSite=Strict');
    expect(a.secure).toBe(false);
    expect(a.issues).toContain('חסר Secure');
  });

  it('auditCookieHeader עוברת ב-cookie תקינה', () => {
    const h = buildSetCookie('x', 'y');
    expect(auditCookieHeader(h).secure).toBe(true);
  });
});
