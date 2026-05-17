import { describe, it, expect, vi } from 'vitest';
import { generateOtpCode, requestOtp, verifyOtp, detectMathRandomUsage, type OtpStore, type OtpSender, type OtpRecord } from '../src/index';

function inMemoryStore(): OtpStore & { records: OtpRecord[] } {
  const records: OtpRecord[] = [];
  return {
    records,
    save: async (r) => { records.push(r); },
    findActive: async (subjectId) => {
      for (let i = records.length - 1; i >= 0; i--) {
        if (records[i]!.subjectId === subjectId && !records[i]!.used) return records[i]!;
      }
      return null;
    },
    update: async (id, patch) => {
      const rec = records.find((r) => r.id === id);
      if (rec) Object.assign(rec, patch);
    },
  };
}

const sender: OtpSender = { send: vi.fn() };

describe('OTP', () => {
  it('generateOtpCode מחזיר 6 ספרות', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it('קודים שונים בכל פעם', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) codes.add(generateOtpCode());
    expect(codes.size).toBeGreaterThan(50); // לא דטרמיניסטי
  });

  it('verifyOtp עם הקוד הנכון', async () => {
    const store = inMemoryStore();
    const sendSpy = vi.fn();
    await requestOtp('u1', '+972500000000', 'sms', store, { send: sendSpy });
    const sentCode = sendSpy.mock.calls[0]![2];
    const out = await verifyOtp('u1', sentCode, store);
    expect(out.ok).toBe(true);
  });

  it('verifyOtp עם קוד שגוי מגדיל attempts', async () => {
    const store = inMemoryStore();
    const sendSpy = vi.fn();
    await requestOtp('u2', 'a@b', 'email', store, { send: sendSpy });
    const out = await verifyOtp('u2', '000000', store);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('incorrect');
  });

  it('5 ניסיונות שגויים → lockout', async () => {
    const store = inMemoryStore();
    const sendSpy = vi.fn();
    await requestOtp('u3', 'a@b', 'email', store, { send: sendSpy });
    let last;
    for (let i = 0; i < 5; i++) last = await verifyOtp('u3', '000000', store);
    expect(last?.ok).toBe(false);
    if (last && !last.ok) expect(last.reason).toBe('locked');
  });

  it('TTL פג תוקף', async () => {
    const store = inMemoryStore();
    const sendSpy = vi.fn();
    await requestOtp('u4', 'a@b', 'email', store, { send: sendSpy });
    const future = new Date(Date.now() + 10 * 60_000);
    const code = sendSpy.mock.calls[0]![2];
    const out = await verifyOtp('u4', code, store, future);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('expired');
  });

  it('detectMathRandomUsage מזהה שימוש', () => {
    const files = new Map([
      ['a.ts', 'const x = Math.random();\nconst y = crypto.randomInt(0, 10);'],
      ['b.ts', 'function f() { return Math.random() * 100; }'],
      ['c.ts', 'crypto.randomInt(100000, 1000000)'],
    ]);
    const violations = detectMathRandomUsage(files);
    expect(violations).toHaveLength(2);
    expect(violations[0]!.file).toBe('a.ts');
    expect(violations[1]!.file).toBe('b.ts');
  });
});
