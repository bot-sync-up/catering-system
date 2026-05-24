import type { PrismaClient } from '@prisma/client';
import { writeAudit } from '../audit/writer';

/**
 * Service-level helper that toggles the `isOfficial` flag on an Answer and
 * emits a dedicated OFFICIAL_TAG_CHANGE audit row.
 *
 * NOTE: even if a developer bypasses this helper and updates `isOfficial`
 * directly through `prisma.answer.update`, the Prisma middleware already
 * detects the diff and emits an OFFICIAL_TAG_CHANGE row in addition to the
 * normal UPDATE row. This service is the *recommended* entry point because
 * it centralises authorisation and surfaces the action explicitly in the
 * codebase.
 */
export async function setOfficialTag(
  prisma: PrismaClient,
  args: {
    answerId: string;
    isOfficial: boolean;
    actingUserId: string;
    actingUserRole: string;
    reason?: string;
  },
): Promise<void> {
  // Only RABBI / EDITOR / GENERAL_ADMIN may flip the official tag.
  if (
    args.actingUserRole !== 'RABBI' &&
    args.actingUserRole !== 'EDITOR' &&
    args.actingUserRole !== 'GENERAL_ADMIN'
  ) {
    await writeAudit(prisma, {
      userId: args.actingUserId,
      entityType: 'Answer',
      entityId: args.answerId,
      action: 'PERMISSION_DENIED',
      newValues: { tried: 'OFFICIAL_TAG_CHANGE', reason: 'role_not_allowed' },
    });
    throw new Error('forbidden');
  }

  const before = await prisma.answer.findUnique({
    where: { id: args.answerId },
    select: { id: true, isOfficial: true, tenantId: true },
  });
  if (!before) throw new Error('answer_not_found');

  if (before.isOfficial === args.isOfficial) {
    // No-op — still record the attempt so historians see the intent.
    await writeAudit(prisma, {
      userId: args.actingUserId,
      entityType: 'Answer',
      entityId: args.answerId,
      action: 'OFFICIAL_TAG_CHANGE',
      oldValues: { isOfficial: before.isOfficial },
      newValues: { isOfficial: args.isOfficial, noop: true, reason: args.reason ?? null },
      tenantId: before.tenantId,
    });
    return;
  }

  await prisma.answer.update({
    where: { id: args.answerId },
    data: { isOfficial: args.isOfficial },
  });

  // Explicit, semantically rich row in addition to the middleware's UPDATE.
  await writeAudit(prisma, {
    userId: args.actingUserId,
    entityType: 'Answer',
    entityId: args.answerId,
    action: 'OFFICIAL_TAG_CHANGE',
    oldValues: { isOfficial: before.isOfficial },
    newValues: { isOfficial: args.isOfficial, reason: args.reason ?? null },
    tenantId: before.tenantId,
  });
}
