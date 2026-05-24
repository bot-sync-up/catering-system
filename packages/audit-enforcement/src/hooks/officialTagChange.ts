/**
 * recordOfficialTagChange — קריטי לציות בפרויקט "ענה את השואל".
 *
 * תיוג "תשובה רשמית" (official=true/false) מהווה הכרעה הלכתית של רב,
 * ולכן כל שינוי בערך זה חייב להישמר עם:
 *   - מצב לפני / מצב אחרי
 *   - מזהה הרב שביצע
 *   - חותמת זמן + IP
 *   - נימוק (טקסט)
 *
 * רישום זה הוא הקובע לציות ולא ניתן לשינוי בשום מצב.
 */
import type { PrismaClient, Prisma } from '@prisma/client';
import { getAuditContext } from '../context';
import { linkHashChain } from '../integrity/hashChain';

export interface OfficialTagChangeInput {
  /** מזהה התשובה */
  answerId: string;
  /** הערך הישן (true / false) */
  oldOfficial: boolean;
  /** הערך החדש */
  newOfficial: boolean;
  /** נימוק חובה — אסור לאפשר שינוי בלי הסבר */
  reason: string;
  /** מזהה הרב המבצע (חייב להיות בעל role RABBI / GENERAL_ADMIN) */
  rabbiUserId: string;
}

export async function recordOfficialTagChange(
  prisma: PrismaClient,
  input: OfficialTagChangeInput,
): Promise<void> {
  if (!input.reason || input.reason.trim().length < 5) {
    throw new Error('אסור לשנות תיוג "תשובה רשמית" ללא נימוק (לפחות 5 תווים).');
  }

  const ctx = getAuditContext();

  // @ts-expect-error — AuditLog
  await prisma.auditLog.create({
    data: await linkHashChain(prisma, {
      model: 'Answer',
      action: 'OFFICIAL_TAG_CHANGED',
      recordId: input.answerId,
      oldValues: { official: input.oldOfficial } as unknown as Prisma.InputJsonValue,
      newValues: {
        official: input.newOfficial,
        reason: input.reason,
        rabbiUserId: input.rabbiUserId,
      } as unknown as Prisma.InputJsonValue,
      userId: input.rabbiUserId,
      ip: ctx.ip,
      userAgent: ctx.ua,
      requestId: ctx.request_id,
      tenantId: ctx.tenant_id,
      role: ctx.role ?? 'RABBI',
      channel: ctx.channel ?? 'web',
      createdAt: new Date(),
    }),
  });
}
