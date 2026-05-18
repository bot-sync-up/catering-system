/**
 * תשתית משותפת לכל ה־extractors.
 *
 * Extractor מחלץ רשומות ממקור (DB ישן) ומחזיר זרם של `ExtractedRecord`s.
 * הוא לא יודע על הסכמה החדשה. ה־transformer הוא זה שיודע למפות.
 */

import { v4 as uuidv4 } from "uuid";
import type { ExtractedRecord, SourceMeta, SourceModule } from "../types.js";

export type { SourceModule };

/** מוסיף meta לפריט גולמי שחולץ. */
export function wrap<T>(
  payload: T,
  meta: { sourceModule: SourceModule; sourceTable: string; originalId: string; batchId: string },
): ExtractedRecord<T> {
  const sourceMeta: SourceMeta = {
    sourceModule: meta.sourceModule,
    sourceTable: meta.sourceTable,
    originalId: meta.originalId,
    batchId: meta.batchId,
    extractedAt: new Date(),
  };
  return { __meta: sourceMeta, payload };
}

/** מייצר batchId חדש (לשימוש מ־CLI אם המשתמש לא סיפק אחד). */
export function newBatchId(): string {
  return `batch_${new Date().toISOString().replace(/[:.]/g, "-")}_${uuidv4().slice(0, 8)}`;
}

/**
 * חוזה משותף לכל extractor — מאפשר אחזור עצלן (async iterator) כדי
 * לעבוד עם DB גדולים בלי להעמיס זיכרון.
 */
export interface Extractor<T = Record<string, unknown>> {
  readonly sourceModule: SourceModule;
  readonly sourceTable: string;
  readonly targetModelHint: string;
  extract(opts: { batchId: string; limit?: number }): AsyncIterable<ExtractedRecord<T>>;
}
