/**
 * SAR — Subject Access Request
 *
 * חוק הגנת הפרטיות (תיקון 13, 2024) + תקנה 13 ל-GDPR:
 * נושא מידע זכאי לקבל את כל המידע שמוחזק עליו במאגר.
 * חובת מענה תוך 30 יום (סעיף 13 לחוק).
 */
import { z } from 'zod';

export const SARStatus = z.enum(['received', 'verifying', 'in_progress', 'completed', 'rejected']);
export type SARStatus = z.infer<typeof SARStatus>;

export const SARRequestSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string(),
  email: z.string().email(),
  requestedAt: z.date(),
  dueBy: z.date(),
  status: SARStatus,
  verificationMethod: z.enum(['email_link', 'sms_otp', 'identity_doc']),
  rejectionReason: z.string().nullable(),
});

export type SARRequest = z.infer<typeof SARRequestSchema>;

export interface DataSource {
  name: string;
  /** מחזיר את כל המידע שיש על נושא המידע במקור הזה */
  exportFor(subjectId: string): Promise<Record<string, unknown>>;
}

export interface SARStore {
  create(req: SARRequest): Promise<void>;
  update(id: string, patch: Partial<SARRequest>): Promise<void>;
  get(id: string): Promise<SARRequest | null>;
}

/**
 * יוצר בקשת SAR חדשה עם דדליין של 30 יום.
 */
export function newSARRequest(
  subjectId: string,
  email: string,
  verificationMethod: SARRequest['verificationMethod'] = 'email_link',
): SARRequest {
  const now = new Date();
  const dueBy = new Date(now);
  dueBy.setDate(dueBy.getDate() + 30);
  return {
    id: crypto.randomUUID(),
    subjectId,
    email,
    requestedAt: now,
    dueBy,
    status: 'received',
    verificationMethod,
    rejectionReason: null,
  };
}

/**
 * מבצע איסוף מידע מכל המקורות לאחר אימות זהות.
 */
export async function executeSAR(
  request: SARRequest,
  sources: DataSource[],
  store: SARStore,
): Promise<Record<string, unknown>> {
  if (request.status !== 'in_progress') {
    throw new Error('SAR לא במצב in_progress');
  }
  const bundle: Record<string, unknown> = {
    _meta: {
      subjectId: request.subjectId,
      generatedAt: new Date().toISOString(),
      requestId: request.id,
      legalBasis: 'חוק הגנת הפרטיות, תשמ"א-1981, סעיף 13',
    },
  };
  for (const src of sources) {
    bundle[src.name] = await src.exportFor(request.subjectId);
  }
  await store.update(request.id, { status: 'completed' });
  return bundle;
}

/**
 * בדיקה אם בקשה איחרה את המועד הקבוע בחוק.
 */
export function isOverdue(req: SARRequest, now: Date = new Date()): boolean {
  return req.status !== 'completed' && req.status !== 'rejected' && now > req.dueBy;
}
