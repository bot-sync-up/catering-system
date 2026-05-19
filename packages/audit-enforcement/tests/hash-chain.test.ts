/**
 * tests/hash-chain.test.ts
 *
 * בדיקות יחידה של computeRowHash + verifyHashChain (עם DB mock בזיכרון).
 */
import { describe, it, expect } from 'vitest';
import { computeRowHash, type AuditLogPayload } from '../src/integrity/hashChain';
import { verifyHashChain } from '../src/integrity/verify';

function payload(overrides: Partial<AuditLogPayload> = {}): AuditLogPayload {
  return {
    model: 'User',
    action: 'create',
    recordId: 'r1',
    oldValues: null,
    newValues: { name: 'a' },
    userId: 'u1',
    ip: '1.1.1.1',
    userAgent: 'ua',
    requestId: 'req1',
    tenantId: 't1',
    role: 'USER',
    channel: 'web',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('computeRowHash', () => {
  it('יציב בין הרצות לאותם נתונים', () => {
    const h1 = computeRowHash(payload(), null);
    const h2 = computeRowHash(payload(), null);
    expect(h1).toBe(h2);
  });

  it('שונה כשמשנים שדה', () => {
    const h1 = computeRowHash(payload({ newValues: { name: 'a' } }), null);
    const h2 = computeRowHash(payload({ newValues: { name: 'b' } }), null);
    expect(h1).not.toBe(h2);
  });

  it('שונה כשמשנים prevHash', () => {
    const h1 = computeRowHash(payload(), null);
    const h2 = computeRowHash(payload(), 'abcd');
    expect(h1).not.toBe(h2);
  });

  it('יציב לסדר keys שונה ב-newValues', () => {
    const h1 = computeRowHash(payload({ newValues: { a: 1, b: 2 } }), null);
    const h2 = computeRowHash(payload({ newValues: { b: 2, a: 1 } }), null);
    expect(h1).toBe(h2);
  });
});

describe('verifyHashChain', () => {
  function buildChain(n: number, tamperAt?: number) {
    const rows: Array<AuditLogPayload & { id: string; hash: string; prevHash: string | null }> = [];
    let prev: string | null = null;
    for (let i = 0; i < n; i++) {
      const p = payload({
        recordId: `r${i}`,
        createdAt: new Date(`2026-01-0${i + 1}T00:00:00Z`),
      });
      const hash = computeRowHash(p, prev);
      rows.push({ ...p, id: `id-${i}`, hash, prevHash: prev });
      prev = hash;
    }
    if (typeof tamperAt === 'number') {
      // שינוי תוכן בלי עדכון hash — כלומר tampering
      (rows[tamperAt].newValues as Record<string, unknown>).name = 'TAMPERED';
    }
    return rows;
  }

  function mockPrisma(rows: ReturnType<typeof buildChain>) {
    return {
      auditLog: {
        async findMany(args: { take: number; cursor?: { id: string } }) {
          const startIdx = args.cursor
            ? rows.findIndex((r) => r.id === args.cursor!.id) + 1
            : 0;
          return rows.slice(startIdx, startIdx + args.take);
        },
      },
    };
  }

  it('שרשרת תקינה מחזירה ok=true', async () => {
    const rows = buildChain(5);
    const result = await verifyHashChain(mockPrisma(rows) as never);
    expect(result.ok).toBe(true);
    expect(result.totalChecked).toBe(5);
  });

  it('זיהוי tampering — hash_mismatch', async () => {
    const rows = buildChain(5, 2);
    const result = await verifyHashChain(mockPrisma(rows) as never);
    expect(result.ok).toBe(false);
    expect(result.brokenRows.length).toBeGreaterThan(0);
    expect(result.brokenRows.some((b) => b.reason === 'hash_mismatch')).toBe(true);
  });
});
