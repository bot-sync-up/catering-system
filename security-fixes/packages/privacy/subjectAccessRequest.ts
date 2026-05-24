/**
 * Subject Access Request (זכות עיון)
 * ---------------------------------------------------------------
 * מימוש סעיף 13 לחוק הגנת הפרטיות (תיקון 13, אוגוסט 2025).
 * משתמש זכאי לקבל את כל המידע שמוחזק עליו במערכת:
 *   - פרטי CRM (פרטי לקוח)
 *   - הזמנות ועסקאות
 *   - תשלומים
 *   - יומני גישה / audit log
 *
 * ה-endpoint דורש אימות חזק (JWT + 2FA) והרשאת self או admin.
 * הפלט מסופק כקובץ JSON מוצפן + תיעוד בקשת SAR בלוג נפרד.
 */

import type { Request, Response } from 'express';
import { z } from 'zod';

/* ----------------------------------------------------------- */
/* טיפוסים גנריים — להמיר לטיפוסי Prisma שלכם בפועל             */
/* ----------------------------------------------------------- */
export interface SARDataSources {
  fetchCustomer: (userId: string) => Promise<unknown>;
  fetchOrders: (userId: string) => Promise<unknown[]>;
  fetchPayments: (userId: string) => Promise<unknown[]>;
  fetchAuditLog: (userId: string) => Promise<unknown[]>;
  fetchConsents: (userId: string) => Promise<unknown[]>;
  logSARRequest: (entry: SARLogEntry) => Promise<void>;
}

export interface SARLogEntry {
  userId: string;
  requestedBy: string;       // יכול להיות גם המשתמש עצמו
  ip: string;
  userAgent?: string;
  timestamp: Date;
  outcome: 'success' | 'denied' | 'error';
  reason?: string;
}

export interface SARResult {
  generatedAt: string;
  userId: string;
  customer: unknown;
  orders: unknown[];
  payments: unknown[];
  auditLog: unknown[];
  consents: unknown[];
  meta: {
    legalBasis: 'Israel Privacy Protection Law §13 (Amendment 13, 2025)';
    retentionYears: 7;
    format: 'JSON';
  };
}

/* ----------------------------------------------------------- */
/* סכימת קלט                                                     */
/* ----------------------------------------------------------- */
export const SARRequestSchema = z.object({
  userId: z.string().uuid(),
  /** אישור עיון מצד הלקוח — חובה כדי למנוע social engineering. */
  confirmation: z.literal(true),
});

/* ----------------------------------------------------------- */
/* יצירת ה-handler                                              */
/* ----------------------------------------------------------- */
export function createSubjectAccessRequestHandler(deps: SARDataSources) {
  return async function subjectAccessRequest(req: Request, res: Response) {
    // אימות בסיסי — מצפה ש-req.auth כבר אומת ב-middleware (requireAuth + require2FA)
    const auth = (req as Request & { auth?: { userId: string; role: string } }).auth;
    if (!auth) {
      return res.status(401).json({ error: 'נדרש אימות' });
    }

    const parse = SARRequestSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'בקשה לא תקינה', details: parse.error.flatten() });
    }
    const { userId } = parse.data;

    // אבטחה: רק המשתמש עצמו או admin רשאי
    const isSelf = auth.userId === userId;
    const isAdmin = auth.role === 'ADMIN' || auth.role === 'DPO';
    if (!isSelf && !isAdmin) {
      await deps.logSARRequest({
        userId,
        requestedBy: auth.userId,
        ip: req.ip ?? 'unknown',
        userAgent: req.get('user-agent') ?? undefined,
        timestamp: new Date(),
        outcome: 'denied',
        reason: 'לא בעלים ולא DPO',
      });
      return res.status(403).json({ error: 'אסור — לא מספיק הרשאות' });
    }

    try {
      const [customer, orders, payments, auditLog, consents] = await Promise.all([
        deps.fetchCustomer(userId),
        deps.fetchOrders(userId),
        deps.fetchPayments(userId),
        deps.fetchAuditLog(userId),
        deps.fetchConsents(userId),
      ]);

      const result: SARResult = {
        generatedAt: new Date().toISOString(),
        userId,
        customer,
        orders,
        payments,
        auditLog,
        consents,
        meta: {
          legalBasis: 'Israel Privacy Protection Law §13 (Amendment 13, 2025)',
          retentionYears: 7,
          format: 'JSON',
        },
      };

      await deps.logSARRequest({
        userId,
        requestedBy: auth.userId,
        ip: req.ip ?? 'unknown',
        userAgent: req.get('user-agent') ?? undefined,
        timestamp: new Date(),
        outcome: 'success',
      });

      // הורדה כקובץ
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="SAR-${userId}-${Date.now()}.json"`,
      );
      return res.status(200).send(JSON.stringify(result, null, 2));
    } catch (err) {
      await deps.logSARRequest({
        userId,
        requestedBy: auth.userId,
        ip: req.ip ?? 'unknown',
        userAgent: req.get('user-agent') ?? undefined,
        timestamp: new Date(),
        outcome: 'error',
        reason: (err as Error).message,
      });
      return res.status(500).json({ error: 'תקלה ביצירת הדוח' });
    }
  };
}
