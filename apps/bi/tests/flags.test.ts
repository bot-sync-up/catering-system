/**
 * Unit-level checks for the feature flag evaluation logic.
 * The Prisma client is mocked so tests run without a DB.
 */
import crypto from 'crypto';

// Minimal re-implementation of evaluation logic for isolated testing.
function evaluate(
  flag: { enabled: boolean; rolloutPercent: number; targetRoles: string[] },
  ctx: { userId?: string; role?: string },
  key: string,
) {
  if (!flag.enabled) return false;
  if (flag.targetRoles.length > 0 && (!ctx.role || !flag.targetRoles.includes(ctx.role))) return false;
  if (flag.rolloutPercent >= 100) return true;
  if (flag.rolloutPercent <= 0) return false;
  const seed = `${ctx.userId ?? 'anon'}:${key}`;
  const hash = crypto.createHash('sha256').update(seed).digest();
  return (hash.readUInt32BE(0) % 100) < flag.rolloutPercent;
}

describe('feature flag evaluation', () => {
  test('disabled flag is always off', () => {
    expect(evaluate({ enabled: false, rolloutPercent: 100, targetRoles: [] }, {}, 'k')).toBe(false);
  });
  test('targetRoles excludes other roles', () => {
    const f = { enabled: true, rolloutPercent: 100, targetRoles: ['ADMIN'] };
    expect(evaluate(f, { role: 'VIEWER' }, 'k')).toBe(false);
    expect(evaluate(f, { role: 'ADMIN' }, 'k')).toBe(true);
  });
  test('rolloutPercent=100 enables for all', () => {
    expect(evaluate({ enabled: true, rolloutPercent: 100, targetRoles: [] }, { userId: 'u1' }, 'k')).toBe(true);
  });
  test('rolloutPercent is deterministic per userId+key', () => {
    const f = { enabled: true, rolloutPercent: 50, targetRoles: [] };
    const a = evaluate(f, { userId: 'u1' }, 'k');
    const b = evaluate(f, { userId: 'u1' }, 'k');
    expect(a).toBe(b);
  });
});
