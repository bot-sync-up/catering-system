/**
 * Archival Cron — העברת מסמכים מתום מחזור חי ל-R2 cold storage.
 *
 * - חוק מס הכנסה (ניהול ספרים, פנקסי חשבונות): שמירת מסמכים 7 שנים.
 * - חוק הגנת הפרטיות: שמירה של לוגי אבטחה.
 *
 * מסמכים שגילם > 365 יום עוברים ל-cold storage (Cloudflare R2 או S3 Glacier).
 * מסמכים שגילם > 7 שנים זכאים למחיקה (אם אין דרישת שמירה נוספת).
 */
import { z } from 'zod';

export const ArchiveStatusSchema = z.enum(['hot', 'cold', 'expired']);
export type ArchiveStatus = z.infer<typeof ArchiveStatusSchema>;

export const ArchiveRecordSchema = z.object({
  id: z.string(),
  kind: z.string(),
  createdAt: z.date(),
  movedToColdAt: z.date().nullable(),
  coldKey: z.string().nullable(),
  checksum: z.string().nullable(),
  status: ArchiveStatusSchema,
});

export type ArchiveRecord = z.infer<typeof ArchiveRecordSchema>;

export interface ColdStorage {
  /** העלאה ל-R2 cold tier. מחזיר key + sha256 */
  upload(key: string, payload: Buffer | string): Promise<{ key: string; sha256: string }>;
  /** מחיקה לאחר תום תקופת השמירה */
  delete(key: string): Promise<void>;
}

export interface ArchivalSource {
  /** מסמכים מועמדים להעברה ל-cold (יותר מ-365 יום) */
  listForCold(olderThan: Date): Promise<ArchiveRecord[]>;
  /** מסמכים שעברו 7 שנים והגיע זמנם למחיקה */
  listForDeletion(olderThan: Date): Promise<ArchiveRecord[]>;
  /** טעינת התוכן עצמו */
  loadPayload(id: string): Promise<Buffer>;
  /** עדכון מטא-דאטה אחרי העברה */
  markCold(id: string, coldKey: string, checksum: string): Promise<void>;
  /** סימון כמחוק לאחר 7 שנים */
  markExpired(id: string): Promise<void>;
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const SEVEN_YEARS_MS = 7 * ONE_YEAR_MS;

export interface ArchivalReport {
  movedToCold: number;
  deletedExpired: number;
  failed: Array<{ id: string; error: string }>;
  startedAt: Date;
  finishedAt: Date;
}

/**
 * הריצה ראשית — להפעיל פעם בלילה.
 */
export async function runArchivalCron(
  source: ArchivalSource,
  cold: ColdStorage,
  now: Date = new Date(),
): Promise<ArchivalReport> {
  const report: ArchivalReport = {
    movedToCold: 0,
    deletedExpired: 0,
    failed: [],
    startedAt: now,
    finishedAt: now,
  };

  // שלב 1: hot → cold
  const coldThreshold = new Date(now.getTime() - ONE_YEAR_MS);
  const candidates = await source.listForCold(coldThreshold);
  for (const rec of candidates) {
    try {
      const payload = await source.loadPayload(rec.id);
      const key = buildColdKey(rec);
      const { sha256 } = await cold.upload(key, payload);
      await source.markCold(rec.id, key, sha256);
      report.movedToCold++;
    } catch (e) {
      report.failed.push({ id: rec.id, error: (e as Error).message });
    }
  }

  // שלב 2: cold → deleted (>= 7 שנים)
  const deleteThreshold = new Date(now.getTime() - SEVEN_YEARS_MS);
  const expired = await source.listForDeletion(deleteThreshold);
  for (const rec of expired) {
    try {
      if (rec.coldKey) await cold.delete(rec.coldKey);
      await source.markExpired(rec.id);
      report.deletedExpired++;
    } catch (e) {
      report.failed.push({ id: rec.id, error: (e as Error).message });
    }
  }

  report.finishedAt = new Date();
  return report;
}

/**
 * מבנה key קבוע ב-R2 שמאפשר ניווט לוגי:
 *   archive/<kind>/<yyyy>/<mm>/<id>.bin
 */
export function buildColdKey(rec: ArchiveRecord): string {
  const y = rec.createdAt.getUTCFullYear();
  const m = String(rec.createdAt.getUTCMonth() + 1).padStart(2, '0');
  return `archive/${rec.kind}/${y}/${m}/${rec.id}.bin`;
}

/**
 * חישוב תאריך תפוגה מותר (7 שנים).
 */
export function expiresAt(createdAt: Date): Date {
  const d = new Date(createdAt);
  d.setFullYear(d.getFullYear() + 7);
  return d;
}
