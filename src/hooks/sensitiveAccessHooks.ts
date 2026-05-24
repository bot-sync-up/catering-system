import type { PrismaClient } from '@prisma/client';
import { writeAudit } from '../audit/writer';

/**
 * Wrap any function that returns sensitive data so the access is recorded.
 * Use for: viewing private user details, contact info, draft questions
 * marked confidential, etc.
 */
export async function recordSensitiveRead<T>(
  prisma: PrismaClient,
  spec: {
    entityType: string;
    entityId?: string | null;
    description?: string;
  },
  loader: () => Promise<T>,
): Promise<T> {
  const result = await loader();
  await writeAudit(prisma, {
    entityType: spec.entityType,
    entityId: spec.entityId ?? null,
    action: 'READ_SENSITIVE',
    newValues: spec.description ? { description: spec.description } : undefined,
  });
  return result;
}

/**
 * Record a permission-denied event. Useful when a user attempts something
 * they're not entitled to — useful signal for security review.
 */
export async function recordPermissionDenied(
  prisma: PrismaClient,
  spec: { entityType: string; entityId?: string | null; reason?: string },
): Promise<void> {
  await writeAudit(prisma, {
    entityType: spec.entityType,
    entityId: spec.entityId ?? null,
    action: 'PERMISSION_DENIED',
    newValues: spec.reason ? { reason: spec.reason } : undefined,
  });
}
