import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export interface AuditInput {
  userId?: string | null;
  actor: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * רושם פעולה ביומן הביקורת. נקרא תמיד דרך הפונקציה הזאת —
 * כך שבסקירה עתידית של רשות הגנת הפרטיות נדע לדלות הכל ממקום אחד.
 */
export async function audit(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      actor: input.actor,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? undefined,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
