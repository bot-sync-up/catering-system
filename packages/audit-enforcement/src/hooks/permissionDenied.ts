/**
 * recordPermissionDenied — תיעוד ניסיון פעולה שנדחה ע"י שכבת ההרשאות.
 * חיוני לזיהוי escalation attempts ולציות (מי ניסה לעשות מה ולא הצליח).
 */
import type { PrismaClient, Prisma } from '@prisma/client';
import { getAuditContext } from '../context';
import { linkHashChain } from '../integrity/hashChain';

export interface PermissionDeniedInput {
  /** הפעולה שנדחתה (למשל "user.update", "salary.read") */
  action: string;
  /** המודל הרלוונטי (אם יש) */
  model?: string | null;
  /** מזהה רשומה (אם יש) */
  recordId?: string | null;
  /** ההרשאה החסרה */
  requiredPermission?: string | null;
  /** ההרשאות שיש למשתמש כרגע */
  userPermissions?: string[];
}

export async function recordPermissionDenied(
  prisma: PrismaClient,
  input: PermissionDeniedInput,
): Promise<void> {
  const ctx = getAuditContext();
  try {
    // @ts-expect-error — AuditLog
    await prisma.auditLog.create({
      data: await linkHashChain(prisma, {
        model: input.model ?? 'Permission',
        action: 'PERMISSION_DENIED',
        recordId: input.recordId ?? null,
        oldValues: null,
        newValues: {
          attemptedAction: input.action,
          requiredPermission: input.requiredPermission ?? null,
          userPermissions: input.userPermissions ?? [],
        } as unknown as Prisma.InputJsonValue,
        userId: ctx.user_id,
        ip: ctx.ip,
        userAgent: ctx.ua,
        requestId: ctx.request_id,
        tenantId: ctx.tenant_id,
        role: ctx.role,
        channel: ctx.channel ?? 'system',
        createdAt: new Date(),
      }),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[audit-enforcement] recordPermissionDenied failed:', err);
  }
}
