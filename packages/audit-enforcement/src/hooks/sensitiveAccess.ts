/**
 * recordSensitiveRead — תיעוד גישה לקריאה של נתונים רגישים.
 * שדות שמחייבים שימוש: שכר, פרטי בנק, ת"ז.
 * אין לסמוך רק על PrismaAuditMiddleware (שמתעד mutations) — קריאה חייבת
 * רישום מפורש כדי לעמוד בדרישות פרטיות / GDPR / חוק הגנת הפרטיות.
 */
import type { PrismaClient, Prisma } from '@prisma/client';
import { getAuditContext } from '../context';
import { linkHashChain } from '../integrity/hashChain';

export interface SensitiveReadInput {
  /** המודל שנקרא (Employee, BankAccount וכו') */
  model: string;
  /** מזהה הרשומה הספציפית שנקראה */
  recordId: string;
  /** רשימת שדות רגישים שנקראו */
  fields: string[];
  /** סיבה (טקסט חופשי — למשל "אישור משכורת חודשית") */
  reason?: string;
}

export async function recordSensitiveRead(
  prisma: PrismaClient,
  input: SensitiveReadInput,
): Promise<void> {
  const ctx = getAuditContext();
  try {
    // @ts-expect-error — SensitiveAccess צפוי להיות מוגדר ב-schema
    await prisma.sensitiveAccess.create({
      data: {
        model: input.model,
        recordId: input.recordId,
        fields: input.fields,
        reason: input.reason ?? null,
        userId: ctx.user_id,
        ip: ctx.ip,
        userAgent: ctx.ua,
        requestId: ctx.request_id,
        tenantId: ctx.tenant_id,
        role: ctx.role,
        createdAt: new Date(),
      },
    });

    // העתק ב-AuditLog (החוט המרכזי של hash chain)
    // @ts-expect-error — AuditLog
    await prisma.auditLog.create({
      data: await linkHashChain(prisma, {
        model: input.model,
        action: 'SENSITIVE_READ',
        recordId: input.recordId,
        oldValues: null,
        newValues: {
          fields: input.fields,
          reason: input.reason ?? null,
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
    console.error('[audit-enforcement] recordSensitiveRead failed:', err);
  }
}
