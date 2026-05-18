#!/usr/bin/env tsx
/**
 * CLI לכלי המיגרציה.
 *
 * דוגמאות:
 *   tsx bin/migrate.ts --source=crm --dry-run --target-tenant=$TENANT
 *   tsx bin/migrate.ts --source=all --target-tenant=$TENANT --limit=1000 --continue-on-error
 *   tsx bin/migrate.ts --source=finance-docs --target-tenant=$TENANT --report=reports/run-2026.json
 *
 * משתני סביבה:
 *   TARGET_DATABASE_URL                — DB יעד (Prisma של הסכמה המאוחדת)
 *   SOURCE_CRM_DATABASE_URL            — DB מקור: CRM
 *   SOURCE_ORDERS_DATABASE_URL         — DB מקור: Orders
 *   SOURCE_FINANCE_DOCS_DATABASE_URL   — DB מקור: Finance Docs
 *   SOURCE_HR_DATABASE_URL             — DB מקור: HR
 *   SOURCE_FLEET_DATABASE_URL          — DB מקור: Fleet
 *   SOURCE_EXPENSES_DATABASE_URL       — DB מקור: Expenses
 */

import { Command } from "commander";
import path from "path";

import { newBatchId } from "../src/extractors/base.js";
import { runMigration } from "../src/engine.js";
import { setLogLevel, log } from "../src/util/logger.js";
import { Reporter } from "../src/util/reporter.js";
import type { MigrationConfig, SourceModule } from "../src/types.js";

const program = new Command();
program
  .name("schema-migrate")
  .description("כלי ETL להעברת נתונים מסכמות מודולריות ישנות לסכמה המאוחדת")
  .option("--source <module>", "מודול מקור: crm|orders|finance-docs|hr|fleet|expenses|all", "all")
  .option("--target-tenant <uuid>", "מזהה דייר יעד (UUID) — חובה")
  .option("--dry-run", "ריצה ללא כתיבה ל־DB", false)
  .option("--limit <n>", "מגביל לכל extractor (לבדיקות)", (v) => parseInt(v, 10))
  .option("--continue-on-error", "ממשיך גם אם שורה נכשלת", false)
  .option("--batch-id <id>", "batch_id לרולבק (ברירת מחדל: נוצר חדש)")
  .option("--report <path>", "נתיב לשמירת report.json", "reports/migration.json")
  .option("-v, --verbose", "פלט מפורט", false);

program.parse(process.argv);
const opts = program.opts();

setLogLevel(opts.verbose ? "debug" : "info");

const targetTenantId: string = opts.targetTenant;
if (!targetTenantId) {
  log.error("חסר --target-tenant. ראה --help.");
  process.exit(2);
}

const targetDatabaseUrl = process.env.TARGET_DATABASE_URL;
if (!targetDatabaseUrl) {
  log.error("חסר TARGET_DATABASE_URL בסביבה.");
  process.exit(2);
}

const sourceDatabaseUrls: Partial<Record<SourceModule, string>> = {};
function maybeSet(mod: SourceModule, envVar: string): void {
  const v = process.env[envVar];
  if (v) sourceDatabaseUrls[mod] = v;
}
maybeSet("crm", "SOURCE_CRM_DATABASE_URL");
maybeSet("orders", "SOURCE_ORDERS_DATABASE_URL");
maybeSet("finance-docs", "SOURCE_FINANCE_DOCS_DATABASE_URL");
maybeSet("hr", "SOURCE_HR_DATABASE_URL");
maybeSet("fleet", "SOURCE_FLEET_DATABASE_URL");
maybeSet("expenses", "SOURCE_EXPENSES_DATABASE_URL");

const config: MigrationConfig = {
  source: (opts.source as SourceModule | "all") ?? "all",
  targetTenantId,
  dryRun: Boolean(opts.dryRun),
  limit: typeof opts.limit === "number" ? opts.limit : undefined,
  continueOnError: Boolean(opts.continueOnError),
  batchId: (opts.batchId as string | undefined) ?? newBatchId(),
  targetDatabaseUrl,
  sourceDatabaseUrls,
  verbose: Boolean(opts.verbose),
};

(async () => {
  try {
    const report = await runMigration(config);
    const reportPath = path.resolve(process.cwd(), opts.report);
    const reporter = new Reporter(config);
    // נוצר reporter חדש רק כדי לשמור — אבל למעשה report של engine מכיל כבר את הסטטיסטיקה.
    // נכתוב ישירות.
    const { promises: fs } = await import("fs");
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");
    log.info(`report נשמר ב־${reportPath}`);
    void reporter; // מונע unused
    process.exit(report.totals.errors > 0 ? 1 : 0);
  } catch (err) {
    log.error("המיגרציה נכשלה", err);
    process.exit(1);
  }
})();
