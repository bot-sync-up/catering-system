/**
 * מנהל את חיבורי ה־Prisma — לקוח אחד ליעד, ולקוחות raw לכל מקור.
 *
 * מאחר שכל מודול ישן הוא Prisma schema נפרד, אנו ניגשים אליהם דרך SQL ישיר
 * (Pool של pg) ולא דרך client typed. זה גם מבודד את הכלי מתלות בסכמות הישנות.
 *
 * הלקוח של היעד הוא ה־PrismaClient מ־packages/db (הסכמה החדשה).
 */

import type { PrismaClient } from "@prisma/client";

type PgPool = { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>; end: () => Promise<void> };

let _targetClient: PrismaClient | null = null;
const _sourcePools: Map<string, PgPool> = new Map();

/**
 * מקבל את ה־PrismaClient של היעד. בהוספה לפרויקט הראשי, ה־import
 * הזה יוחלף ל־`import { PrismaClient } from "@unified/db";`.
 */
export async function getTargetClient(databaseUrl: string): Promise<PrismaClient> {
  if (_targetClient) return _targetClient;
  // טעינה דינמית כדי לאפשר בדיקות mock ללא תלות ב־prisma generate.
  const { PrismaClient } = await import("@prisma/client");
  _targetClient = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: ["warn", "error"],
  });
  return _targetClient;
}

/**
 * מקבל Pool של `pg` למקור נתון. שימוש ב־raw SQL מבטל את הצורך לייבא
 * את הסכמות הישנות כתלויות.
 */
export async function getSourcePool(sourceModule: string, databaseUrl: string): Promise<PgPool> {
  const existing = _sourcePools.get(sourceModule);
  if (existing) return existing;
  const { Pool } = (await import("pg")) as unknown as {
    Pool: new (cfg: { connectionString: string; max?: number }) => PgPool;
  };
  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  _sourcePools.set(sourceModule, pool);
  return pool;
}

/** סוגר את כל החיבורים. נקרא בסיום ריצה. */
export async function closeAll(): Promise<void> {
  if (_targetClient) {
    await _targetClient.$disconnect();
    _targetClient = null;
  }
  for (const [, pool] of _sourcePools) {
    await pool.end();
  }
  _sourcePools.clear();
}
