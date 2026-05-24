#!/usr/bin/env tsx
/**
 * CLI ל־validation: מריץ count match + integrity ושומר תוצאות JSON.
 *
 *   tsx bin/validate.ts --out=reports/validation.json
 */

import { Command } from "commander";
import path from "path";
import { promises as fs } from "fs";

import { setLogLevel, log } from "../src/util/logger.js";
import { runCountMatch, runIntegrityChecks } from "../src/validate/index.js";
import { getSourcePool, getTargetClient, closeAll } from "../src/util/prismaClient.js";
import type { SourceModule } from "../src/types.js";

const program = new Command();
program
  .name("schema-validate")
  .option("--out <path>", "מיקום לתוצאות", "reports/validation.json")
  .option("-v, --verbose", false);

program.parse(process.argv);
const opts = program.opts();
setLogLevel(opts.verbose ? "debug" : "info");

const target = process.env.TARGET_DATABASE_URL;
if (!target) {
  log.error("חסר TARGET_DATABASE_URL");
  process.exit(2);
}

const sources: Partial<Record<SourceModule, string>> = {};
for (const [k, v] of [
  ["crm", "SOURCE_CRM_DATABASE_URL"],
  ["orders", "SOURCE_ORDERS_DATABASE_URL"],
  ["finance-docs", "SOURCE_FINANCE_DOCS_DATABASE_URL"],
  ["hr", "SOURCE_HR_DATABASE_URL"],
  ["fleet", "SOURCE_FLEET_DATABASE_URL"],
  ["expenses", "SOURCE_EXPENSES_DATABASE_URL"],
] as Array<[SourceModule, string]>) {
  const env = process.env[v];
  if (env) sources[k] = env;
}

(async () => {
  const prisma = await getTargetClient(target);
  const pools: Partial<Record<SourceModule, unknown>> = {};
  for (const [mod, url] of Object.entries(sources)) {
    if (url) pools[mod as SourceModule] = await getSourcePool(mod, url);
  }
  const countMatches = await runCountMatch(
    prisma,
    pools as Parameters<typeof runCountMatch>[1],
  );
  const integrityIssues = await runIntegrityChecks(prisma);
  await closeAll();

  const outPath = path.resolve(process.cwd(), opts.out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(
    outPath,
    JSON.stringify({ countMatches, integrityIssues }, null, 2),
    "utf-8",
  );
  log.info(`validation נשמר ב־${outPath}`);
  const failed = countMatches.filter((m) => !m.ok).length + integrityIssues.length;
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  log.error("validation נכשל", err);
  process.exit(1);
});
