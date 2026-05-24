/**
 * tests/middleware.test.ts
 * בדיקות יחידה ל-PrismaAuditMiddleware:
 *   - נכתב log על create/update/delete
 *   - שדות רגישים מסוננים
 *   - הקשר מ-AsyncLocalStorage נכנס לרשומה
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attachPrismaAuditMiddleware } from '../src/PrismaAuditMiddleware';
import { runWithAuditContext } from '../src/context';

// Mock פשוט של PrismaClient עם תמיכה ב-$use
function createMockPrisma() {
  const auditCreate = vi.fn(async ({ data }: { data: unknown }) => data);
  const auditFindFirst = vi.fn(async () => null);
  const userFindUnique = vi.fn(async () => ({ id: 'u1', name: 'old name' }));

  let middleware: ((p: unknown, next: (p: unknown) => Promise<unknown>) => Promise<unknown>) | null =
    null;

  const prisma = {
    $use(mw: (p: unknown, next: (p: unknown) => Promise<unknown>) => Promise<unknown>) {
      middleware = mw;
    },
    auditLog: { create: auditCreate, findFirst: auditFindFirst },
    user: { findUnique: userFindUnique },
    async _invoke(params: unknown, result: unknown) {
      if (!middleware) throw new Error('middleware not attached');
      return middleware(params, async () => result);
    },
  };

  return { prisma, auditCreate, auditFindFirst, userFindUnique };
}

describe('PrismaAuditMiddleware', () => {
  let mocks: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mocks = createMockPrisma();
    attachPrismaAuditMiddleware(mocks.prisma as never);
  });

  it('כותב רשומת ביקורת על create', async () => {
    await runWithAuditContext(
      {
        user_id: 'u1',
        ip: '1.2.3.4',
        ua: 'jest',
        request_id: 'r1',
        tenant_id: 't1',
        role: 'ADMIN',
        channel: 'web',
      },
      async () => {
        await mocks.prisma._invoke(
          { model: 'User', action: 'create', args: { data: { name: 'נח' } } },
          { id: 'u-new', name: 'נח' },
        );
      },
    );
    expect(mocks.auditCreate).toHaveBeenCalledOnce();
    const data = mocks.auditCreate.mock.calls[0][0].data;
    expect(data.action).toBe('create');
    expect(data.model).toBe('User');
    expect(data.userId).toBe('u1');
    expect(data.ip).toBe('1.2.3.4');
    expect(data.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('מסנן שדות רגישים', async () => {
    await runWithAuditContext(
      { user_id: 'u1', ip: null, ua: null, request_id: null, tenant_id: null, role: null },
      async () => {
        await mocks.prisma._invoke(
          {
            model: 'User',
            action: 'create',
            args: { data: { name: 'נח', password: 'secret123', token: 'xyz' } },
          },
          { id: 'u-new', name: 'נח', password: 'secret123', token: 'xyz' },
        );
      },
    );
    const data = mocks.auditCreate.mock.calls[0][0].data;
    expect(data.newValues.password).toBe('[REDACTED]');
    expect(data.newValues.token).toBe('[REDACTED]');
    expect(data.newValues.name).toBe('נח');
  });

  it('מדלג על מודל AuditLog עצמו', async () => {
    await mocks.prisma._invoke(
      { model: 'AuditLog', action: 'create', args: { data: {} } },
      { id: 'a1' },
    );
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it('שולף oldValues על update', async () => {
    await runWithAuditContext(
      { user_id: 'u1', ip: null, ua: null, request_id: null, tenant_id: null, role: null },
      async () => {
        await mocks.prisma._invoke(
          {
            model: 'User',
            action: 'update',
            args: { where: { id: 'u1' }, data: { name: 'new' } },
          },
          { id: 'u1', name: 'new' },
        );
      },
    );
    expect(mocks.userFindUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
    const data = mocks.auditCreate.mock.calls[0][0].data;
    expect(data.oldValues).toMatchObject({ name: 'old name' });
    expect(data.newValues).toMatchObject({ name: 'new' });
  });
});
