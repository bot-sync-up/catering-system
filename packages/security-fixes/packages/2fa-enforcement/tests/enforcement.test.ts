import { describe, it, expect, vi } from 'vitest';
import { evaluate, require2faMiddleware, DEFAULT_CONFIG } from '../src/index';

describe('2FA enforcement', () => {
  it('משתמש רגיל לא מחייב 2FA', () => {
    const d = evaluate({
      userId: 'u', roles: ['user'], twoFactorEnrolled: [], twoFactorVerifiedAt: null,
    });
    expect(d.allow).toBe(true);
  });

  it('admin בלי 2FA רשום → enroll נדרש', () => {
    const d = evaluate({
      userId: 'u', roles: ['admin'], twoFactorEnrolled: [], twoFactorVerifiedAt: null,
    });
    expect(d.allow).toBe(false);
    if (!d.allow) expect(d.reason).toBe('no_2fa_enrolled');
  });

  it('admin עם TOTP אבל לא verified → verify', () => {
    const d = evaluate({
      userId: 'u', roles: ['admin'], twoFactorEnrolled: ['totp'], twoFactorVerifiedAt: null,
    });
    expect(d.allow).toBe(false);
    if (!d.allow) expect(d.reason).toBe('2fa_required');
  });

  it('admin verified ותקופה תקפה → אישור', () => {
    const d = evaluate({
      userId: 'u', roles: ['admin'], twoFactorEnrolled: ['totp'], twoFactorVerifiedAt: new Date(),
    });
    expect(d.allow).toBe(true);
  });

  it('verified ישן מ-8 שעות → stale', () => {
    const old = new Date(Date.now() - 9 * 60 * 60 * 1000);
    const d = evaluate({
      userId: 'u', roles: ['admin'], twoFactorEnrolled: ['totp'], twoFactorVerifiedAt: old,
    });
    expect(d.allow).toBe(false);
    if (!d.allow) expect(d.reason).toBe('2fa_stale');
  });

  it('SMS לבד נדחה', () => {
    const d = evaluate({
      userId: 'u', roles: ['admin'], twoFactorEnrolled: ['sms'], twoFactorVerifiedAt: new Date(),
    }, { ...DEFAULT_CONFIG, allowSms: false });
    expect(d.allow).toBe(false);
    if (!d.allow) expect(d.reason).toBe('sms_disallowed');
  });

  it('middleware מחזיר 401 ללא user', () => {
    const mw = require2faMiddleware();
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    mw({ path: '/admin' } as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('middleware מאשר admin תקין', () => {
    const mw = require2faMiddleware();
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    mw({
      path: '/admin',
      user: { userId: 'u', roles: ['admin'], twoFactorEnrolled: ['totp'], twoFactorVerifiedAt: new Date() },
    }, res as any, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
