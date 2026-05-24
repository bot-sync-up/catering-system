/**
 * זכות למחיקה / אנונימיזציה
 *
 * חוק הגנת הפרטיות סעיף 14 — זכות למחיקת מידע לא נכון/לא מעודכן/לא רלוונטי.
 * GDPR Article 17 — Right to be forgotten.
 *
 * מדיניות: כאשר חובת שמירה רגולטורית קיימת (חשבוניות, מס הכנסה — 7 שנים),
 * אסור למחוק לחלוטין. במקום זה מבצעים אנונימיזציה (pseudonymization)
 * ששומרת על שלמות החשבונאות אבל מנתקת את הקשר לנושא המידע.
 */
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

export const ErasureModeSchema = z.enum(['hard_delete', 'anonymize', 'pseudonymize']);
export type ErasureMode = z.infer<typeof ErasureModeSchema>;

export interface ErasurePolicy {
  /** טבלה/אובייקט במערכת */
  resource: string;
  /** מצב המחיקה */
  mode: ErasureMode;
  /** שדות שיש לאפס לחלוטין */
  nullFields?: string[];
  /** שדות שיש להחליף ב-hash דטרמיניסטי (לשמירת JOINs) */
  hashFields?: string[];
  /** האם יש חובת שמירה רגולטורית */
  retentionRequired: boolean;
  /** עד מתי חובת השמירה */
  retentionUntil?: (createdAt: Date) => Date;
}

const PEPPER = process.env.PRIVACY_HASH_PEPPER || randomBytes(32).toString('hex');

/**
 * Hash דטרמיניסטי עם pepper.
 * מאפשר לשמור על קישוריות (JOIN לפי user_id) בלי לחשוף את הזהות.
 */
export function pseudonymize(value: string): string {
  return createHash('sha256').update(`${PEPPER}::${value}`).digest('hex').slice(0, 32);
}

/**
 * מחליף ערך אישי בערך אנונימי קבוע.
 */
export function anonymizeValue(field: string): string | null {
  const map: Record<string, string | null> = {
    email: 'anonymized@deleted.local',
    phone: '+972000000000',
    name: 'משתמש שנמחק',
    full_name: 'משתמש שנמחק',
    address: null,
    id_number: null,
    ip_address: '0.0.0.0',
  };
  return field in map ? map[field] : null;
}

export interface ErasureResult {
  resource: string;
  affectedRows: number;
  mode: ErasureMode;
  appliedAt: Date;
}

export interface ErasureDriver {
  hardDelete(resource: string, subjectId: string): Promise<number>;
  updateBySubject(
    resource: string,
    subjectId: string,
    patch: Record<string, string | null>,
  ): Promise<number>;
}

/**
 * מבצע אנונימיזציה לפי policy.
 */
export async function eraseSubject(
  subjectId: string,
  policies: ErasurePolicy[],
  driver: ErasureDriver,
  now: Date = new Date(),
): Promise<ErasureResult[]> {
  const results: ErasureResult[] = [];

  for (const policy of policies) {
    // אם יש חובת שמירה - לא נמחק; רק אנונימיזציה
    const effectiveMode: ErasureMode =
      policy.retentionRequired && policy.mode === 'hard_delete'
        ? 'anonymize'
        : policy.mode;

    let affected = 0;

    if (effectiveMode === 'hard_delete') {
      affected = await driver.hardDelete(policy.resource, subjectId);
    } else {
      const patch: Record<string, string | null> = {};
      for (const f of policy.nullFields ?? []) {
        patch[f] = anonymizeValue(f);
      }
      for (const f of policy.hashFields ?? []) {
        patch[f] = pseudonymize(`${subjectId}::${f}`);
      }
      affected = await driver.updateBySubject(policy.resource, subjectId, patch);
    }

    results.push({
      resource: policy.resource,
      affectedRows: affected,
      mode: effectiveMode,
      appliedAt: now,
    });
  }

  return results;
}

/**
 * מדיניות ברירת מחדל לישראל:
 * - חשבוניות + רשומות מס: anonymize (חובת שמירה 7 שנים)
 * - מידע שיווקי / preferences: hard_delete
 * - לוגים: anonymize של IP + user_id
 */
export const DEFAULT_ISRAEL_POLICIES: ErasurePolicy[] = [
  {
    resource: 'invoices',
    mode: 'anonymize',
    nullFields: ['customer_name', 'customer_email', 'customer_address'],
    hashFields: ['customer_id'],
    retentionRequired: true,
    retentionUntil: (createdAt) => {
      const d = new Date(createdAt);
      d.setFullYear(d.getFullYear() + 7);
      return d;
    },
  },
  {
    resource: 'marketing_preferences',
    mode: 'hard_delete',
    retentionRequired: false,
  },
  {
    resource: 'audit_logs',
    mode: 'anonymize',
    nullFields: ['ip_address'],
    hashFields: ['user_id'],
    retentionRequired: true,
    retentionUntil: (createdAt) => {
      const d = new Date(createdAt);
      d.setFullYear(d.getFullYear() + 7);
      return d;
    },
  },
  {
    resource: 'users',
    mode: 'anonymize',
    nullFields: ['email', 'phone', 'full_name', 'address'],
    hashFields: ['id'],
    retentionRequired: true,
  },
];
