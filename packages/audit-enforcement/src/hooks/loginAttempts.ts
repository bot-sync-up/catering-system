/**
 * recordLoginAttempt — תיעוד ניסיון התחברות + זיהוי rate-limit / brute-force.
 *
 * מתוזמן להישלח מתוך זרימת ה-login (אחרי בדיקת סיסמה — בין אם הצליחה ובין אם לא).
 * אם זוהו N+ ניסיונות כושלים מאותו IP / userId בחלון זמן — מסומן.
 */
import type { PrismaClient, Prisma } from '@prisma/client';
import { linkHashChain } from '../integrity/hashChain';

export interface RecordLoginInput {
  userId: string | null;
  email: string | null;
  ip: string | null;
  ua: string | null;
  success: boolean;
  failureReason?: string | null;
}

export interface RecordLoginOptions {
  /** מספר ניסיונות כושלים שייחשבו brute-force (ברירת מחדל: 5) */
  bruteForceThreshold?: number;
  /** חלון זמן בדקות (ברירת מחדל: 15) */
  windowMinutes?: number;
  /** callback שייקרא אם זוהה brute-force */
  onBruteForceDetected?: (info: { ip: string | null; userId: string | null; count: number }) => Promise<void> | void;
}

export async function recordLoginAttempt(
  prisma: PrismaClient,
  input: RecordLoginInput,
  options: RecordLoginOptions = {},
): Promise<void> {
  const threshold = options.bruteForceThreshold ?? 5;
  const windowMin = options.windowMinutes ?? 15;

  // @ts-expect-error — LoginAttempt צפוי להיות מוגדר ב-schema
  await prisma.loginAttempt.create({
    data: {
      userId: input.userId,
      email: input.email,
      ip: input.ip,
      userAgent: input.ua,
      success: input.success,
      failureReason: input.failureReason ?? null,
      createdAt: new Date(),
    },
  });

  if (input.success) return;

  // ספירת ניסיונות כושלים בחלון זמן
  const since = new Date(Date.now() - windowMin * 60 * 1000);
  // @ts-expect-error — LoginAttempt
  const recentFailures = await prisma.loginAttempt.count({
    where: {
      success: false,
      createdAt: { gte: since },
      OR: [
        input.ip ? { ip: input.ip } : undefined,
        input.userId ? { userId: input.userId } : undefined,
        input.email ? { email: input.email } : undefined,
      ].filter(Boolean) as Prisma.LoginAttemptWhereInput[],
    },
  });

  if (recentFailures >= threshold) {
    // רישום אירוע חשוד ב-AuditLog
    try {
      // @ts-expect-error — AuditLog
      await prisma.auditLog.create({
        data: await linkHashChain(prisma, {
          model: 'LoginAttempt',
          action: 'BRUTE_FORCE_DETECTED',
          recordId: null,
          oldValues: null,
          newValues: {
            ip: input.ip,
            userId: input.userId,
            email: input.email,
            count: recentFailures,
            windowMinutes: windowMin,
          } as unknown as Prisma.InputJsonValue,
          userId: 'system',
          ip: input.ip,
          userAgent: input.ua,
          requestId: null,
          tenantId: null,
          role: 'SYSTEM',
          channel: 'system',
          createdAt: new Date(),
        }),
      });
    } catch {
      // לא נכשל את ה-login flow
    }
    await options.onBruteForceDetected?.({
      ip: input.ip,
      userId: input.userId,
      count: recentFailures,
    });
  }
}
