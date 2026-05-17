import { sanitize, diff } from '../src/audit/sanitize';

describe('sanitize', () => {
  it('replaces sensitive field values with ***', () => {
    const out = sanitize({
      email: 'a@b.com',
      passwordHash: 'super-secret',
      nested: { token: 'xyz', name: 'ok' },
    });
    expect(out).toEqual({
      email: 'a@b.com',
      passwordHash: '***',
      nested: { token: '***', name: 'ok' },
    });
  });

  it('handles arrays, dates, bigints, and circular refs', () => {
    const a: Record<string, unknown> = { d: new Date('2026-01-01T00:00:00Z'), n: 10n };
    a.self = a;
    const out = sanitize(a) as Record<string, unknown>;
    expect(out.d).toBe('2026-01-01T00:00:00.000Z');
    expect(out.n).toBe('10');
    expect(out.self).toBe('<circular>');
  });
});

describe('diff', () => {
  it('returns only changed keys', () => {
    const before = { a: 1, b: 2, c: 3 };
    const after = { a: 1, b: 99, c: 3 };
    expect(diff(before, after)).toEqual({ old: { b: 2 }, new: { b: 99 } });
  });

  it('handles missing/added keys', () => {
    const before = { a: 1 };
    const after = { a: 1, b: 2 };
    expect(diff(before, after)).toEqual({ old: { b: undefined }, new: { b: 2 } });
  });
});
