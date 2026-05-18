#!/usr/bin/env tsx
/**
 * CLI לרולבק — מבטל את כל הרשומות ששייכות ל־batch_id מסוים.
 *
 * הרולבק עובד על השדה `_migration_batch_id` (snake_case) שנשמר בכל
 * רשומה שנטענה. הסכמה החדשה מצפה לעמודה זו על כל הטבלאות שעוברות
 * מיגרציה.
 *
 * שימוש:
 *   tsx bin/rollback.ts --batch-id=batch_2026-05-17T... --dry-run
 *   tsx bin/rollback.ts --batch-id=batch_2026-05-17T... --tables=invoices,events
 */

import { Command } from "commander";
import { Pool } from "pg";

import { setLogLevel, log } from "../src/util/logger.js";

const program = new Command();
program
  .name("schema-rollback")
  .description("מבטל מיגרציה לפי batch_id — מוחק רק רשומות שנוצרו על־ידי הריצה")
  .requiredOption("--batch-id <id>", "מזהה ה־batch שיש לבטל")
  .option(
    "--tables <list>",
    "רשימת טבלאות מופרדות בפסיק (ברירת מחדל: כל הטבלאות הרלוונטיות)",
    "payments,receipts,invoices,events,expenses,leads,vehicles,employees,customers",
  )
  .option("--dry-run", "הצג מה היה נמחק, בלי באמת למחוק", false)
  .option("-v, --verbose", "פלט מפורט", false);

program.parse(process.argv);
const opts = program.opts();
setLogLevel(opts.verbose ? "debug" : "info");

const databaseUrl = process.env.TARGET_DATABASE_URL;
if (!databaseUrl) {
  log.error("חסר TARGET_DATABASE_URL בסביבה.");
  process.exit(2);
}

const tables = String(opts.tables)
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);

(async () => {
  const pool = new Pool({ connectionString: databaseUrl });
  const batchId = String(opts.batchId);
  log.info(`rollback ל־batch_id=${batchId}, dryRun=${opts.dryRun}`);

  let totalDeleted = 0;
  try {
    for (const table of tables) {
      const countSql = `SELECT COUNT(*)::int AS c FROM ${table} WHERE _migration_batch_id = $1`;
      const countRes = await pool.query(countSql, [batchId]);
      const c = Number((countRes.rows[0] as { c?: number } | undefined)?.c ?? 0);
      log.info(`${table}: ${c} רשומות מסומנות למחיקה`);
      if (c === 0) continue;
      if (opts.dryRun) {
        totalDeleted += c;
        continue;
      }
      const delSql = `DELETE FROM ${table} WHERE _migration_batch_id = $1`;
      const delRes = await pool.query(delSql, [batchId]);
      log.info(`${table}: נמחקו ${delRes.rows.length}`);
      totalDeleted += c;
    }
    log.info(`סה"כ ${opts.dryRun ? "(dry-run) " : ""}${totalDeleted} רשומות`);
  } catch (err) {
    log.error("rollback נכשל", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
