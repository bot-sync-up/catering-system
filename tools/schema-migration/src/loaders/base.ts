/**
 * תשתית טעינה ל־DB יעד.
 *
 * הגישה היא upsert idempotent — כך שהרצה חוזרת לא מכפילה.
 * conflict resolution: ערכים מהיעד אם הם חדשים יותר (updatedAt), אחרת מהמקור.
 */

import type { PrismaClient } from "@prisma/client";
import type { LoadResult, TransformedRecord } from "../types.js";

export interface LoaderOptions {
  prisma: PrismaClient;
  dryRun: boolean;
}

export interface Loader<T = unknown> {
  readonly targetModel: string;
  load(rec: TransformedRecord<T>, opts: LoaderOptions): Promise<LoadResult>;
}

/**
 * Conflict resolver גנרי: אם רשומה קיימת, ההחלטה היא לפי updatedAt.
 * זה מתאים לתרחיש שבו המקור הישן ממשיך לקבל עדכונים זמן־מה במקביל.
 */
export function shouldOverwrite(
  existingUpdatedAt: Date | null | undefined,
  incomingUpdatedAt: Date | null | undefined,
): boolean {
  if (!existingUpdatedAt) return true;
  if (!incomingUpdatedAt) return false;
  return incomingUpdatedAt.getTime() > existingUpdatedAt.getTime();
}
