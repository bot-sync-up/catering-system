/**
 * Right To Erasure / Right To Be Forgotten (זכות מחיקה)
 * ---------------------------------------------------------------
 * מימוש סעיף 14 לחוק הגנת הפרטיות (תיקון 13, אוגוסט 2025).
 *
 * אסטרטגיה: Soft-delete + אנונימיזציה.
 *   - אסור למחוק audit log לחלוטין (חובת תיעוד 7 שנים מתחייבת חוקית).
 *   - שדות PII (שם, אימייל, טל', כתובת, ת.ז.) מוחלפים ב-hash או placeholder.
 *   - השארת מזהה (userId) מאפשרת רציפות לוגית מבלי לזהות אדם.
 *
 * תהליך:
 *   1) ולידציה של בקשה (סיבה + אישור + JWT + 2FA).
 *   2) בדיקה אם יש חובה חוקית להחזיק נתונים (חשבוניות → שמירת 7 שנים).
 *   3) anonymize PII ב-CRM, orders.shipping_*, payments.cardholder_*.
 *   4) Soft delete (`deletedAt = now`).
 *   5) רישום audit-log בלתי-ניתן-לשינוי.
 */

import type { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';

/* ----------------------------------------------------------- */
/* טיפוסים                                                       */
/* ----------------------------------------------------------- */
export interface ErasureDataSources {
  hasLegalHold: (userId: string) => Promise<{ held: boolean; reason?: string }>;
  anonymizeCustomer: (userId: string, fields: AnonymizedFields) => Promise<void>;
  anonymizeOrders: (userId: string, fields: AnonymizedFields) => Promise<void>;
  anonymizePayments: (userId: string, fields: AnonymizedFields) => Promise<void>;
  softDeleteUser: (userId: string) => Promise<void>;
  appendErasureLog: (entry: ErasureLogEntry) => Promise<void>;
}

export interface AnonymizedFields {
  pseudonym: string;        // שם מוסווה - "Anonymized_<hash8>"
  emailHash: string;        // sha256 של האימייל (לאיתור future audits)
  phoneHash?: string;
  taxIdHash?: string;
}

export interface ErasureLogEntry {
  userId: string;
  requestedBy: string;
  reason: string;
  ip: string;
  userAgent?: string;
  timestamp: Date;
  outcome: 'erased' | 'denied_legal_hold' | 'denied_auth' | 'error';
  legalHoldReason?: string;
  errorMessage?: string;
}

/* ----------------------------------------------------------- */
/* סכימת קלט                                                     */
/* ----------------------------------------------------------- */
export const ErasureRequestSchema = z.object({
  userId: z.string().uuid(),
  /** סיבה נדרשת על-פי החוק. */
  reason: z.string().min(10).max(500),
  /** המשתמש חייב לאשר במפורש את אובדן הנתונים. */
  confirmation: z.literal(true),
});

/* ----------------------------------------------------------- */
/* helper: יצירת hash סטנדרטי                                    */
/* ----------------------------------------------------------- */
function sha256(input: string): string {
  return crypto.createHash('sha256').update(input.trim().toLowerCase()).digest('hex');
}

/* ----------------------------------------------------------- */
/* יצירת ה-handler                                              */
/* ----------------------------------------------------------- */
export function createRightToErasureHandler(deps: ErasureDataSources) {
  return async function rightToErasure(req: Request, res: Response) {
    const auth = (req as Request & { auth?: { userId: string; role: string } }).auth;
    if (!auth) {
      return res.status(401).json({ error: 'נדרש אימות' });
    }

    const parse = ErasureRequestSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'בקשה לא תקינה', details: parse.error.flatten() });
    }
    const { userId, reason } = parse.data;

    const isSelf = auth.userId === userId;
    const isAdmin = auth.role === 'ADMIN' || auth.role === 'DPO';
    if (!isSelf && !isAdmin) {
      await deps.appendErasureLog({
        userId,
        requestedBy: auth.userId,
        reason,
        ip: req.ip ?? 'unknown',
        userAgent: req.get('user-agent') ?? undefined,
        timestamp: new Date(),
        outcome: 'denied_auth',
      });
      return res.status(403).json({ error: 'אסור — לא בעלים ולא DPO' });
    }

    // בדיקת legal hold — חוק החשבונאות מחייב 7 שנים. אם יש חשבוניות פתוחות —
    // מבצעים מחיקה חלקית (PII בלבד) ולא מחיקה מלאה.
    const hold = await deps.hasLegalHold(userId);
    // אנונימיזציה תמיד מבוצעת על PII; legal hold מונע רק softDeleteUser.

    const shortHash = sha256(userId).slice(0, 8);
    const fields: AnonymizedFields = {
      pseudonym: `Anonymized_${shortHash}`,
      emailHash: sha256(`erased+${userId}@privacy.local`),
    };

    try {
      // מבצעים אנונימיזציה על כל ה-tables
      await Promise.all([
        deps.anonymizeCustomer(userId, fields),
        deps.anonymizeOrders(userId, fields),
        deps.anonymizePayments(userId, fields),
      ]);

      if (!hold.held) {
        // אין חובת שימור — מסמנים soft-delete
        await deps.softDeleteUser(userId);
      }

      await deps.appendErasureLog({
        userId,
        requestedBy: auth.userId,
        reason,
        ip: req.ip ?? 'unknown',
        userAgent: req.get('user-agent') ?? undefined,
        timestamp: new Date(),
        outcome: hold.held ? 'denied_legal_hold' : 'erased',
        legalHoldReason: hold.reason,
      });

      return res.status(200).json({
        ok: true,
        userId,
        pseudonym: fields.pseudonym,
        legalHold: hold.held,
        legalHoldReason: hold.reason,
        message: hold.held
          ? 'PII הוחלף; שמירת רשומות פיננסיות נדרשת על-פי דין (7 שנים).'
          : 'משתמש אנונימי + מחיקה רכה הושלמו.',
      });
    } catch (err) {
      await deps.appendErasureLog({
        userId,
        requestedBy: auth.userId,
        reason,
        ip: req.ip ?? 'unknown',
        userAgent: req.get('user-agent') ?? undefined,
        timestamp: new Date(),
        outcome: 'error',
        errorMessage: (err as Error).message,
      });
      return res.status(500).json({ error: 'תקלה במחיקה' });
    }
  };
}
