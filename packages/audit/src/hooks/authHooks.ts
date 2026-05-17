import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { writeAudit } from '../audit/writer';
import { signToken, type SessionUser } from '../auth/jwt';

/**
 * Login hook — wraps password verification and emits audit rows for both
 * success and failure cases. Failures NEVER include why (no enumeration leak)
 * but the row records that an attempt happened against this email.
 *
 * Returns `{ ok: false }` for any failure mode so callers can't distinguish
 * "wrong password" from "no such user" from the response shape.
 */
export async function loginHook(
  prisma: PrismaClient,
  email: string,
  password: string,
  meta: { ip?: string | null; userAgent?: string | null },
): Promise<
  | { ok: true; token: string; user: SessionUser }
  | { ok: false }
> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    await writeAudit(prisma, {
      userId: user?.id ?? null,
      entityType: 'Auth',
      entityId: email,
      action: 'LOGIN_FAILURE',
      newValues: { reason: user ? 'inactive' : 'no_such_user' },
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    });
    return { ok: false };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await writeAudit(prisma, {
      userId: user.id,
      entityType: 'Auth',
      entityId: email,
      action: 'LOGIN_FAILURE',
      newValues: { reason: 'bad_password' },
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
      tenantId: user.tenantId,
    });
    return { ok: false };
  }

  const session: SessionUser = {
    id: user.id,
    role: user.role,
    tenantId: user.tenantId,
    email: user.email,
  };

  await writeAudit(prisma, {
    userId: user.id,
    entityType: 'Auth',
    entityId: email,
    action: 'LOGIN_SUCCESS',
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ?? null,
    tenantId: user.tenantId,
  });

  return { ok: true, token: signToken(session), user: session };
}

export async function logoutHook(
  prisma: PrismaClient,
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null; tenantId?: string | null },
): Promise<void> {
  await writeAudit(prisma, {
    userId,
    entityType: 'Auth',
    entityId: userId,
    action: 'LOGOUT',
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ?? null,
    tenantId: meta.tenantId ?? null,
  });
}

export async function passwordChangeHook(
  prisma: PrismaClient,
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null; tenantId?: string | null },
): Promise<void> {
  // The actual password change goes through Prisma — middleware records
  // the UPDATE on User. This hook adds a semantically richer row that
  // doesn't leak anything beyond "password was changed".
  await writeAudit(prisma, {
    userId,
    entityType: 'User',
    entityId: userId,
    action: 'PASSWORD_CHANGE',
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ?? null,
    tenantId: meta.tenantId ?? null,
  });
}
