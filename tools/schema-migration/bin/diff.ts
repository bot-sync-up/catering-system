#!/usr/bin/env tsx
/**
 * CLI ל־diff: מקבל before.json + after.json + report.json של ריצה,
 * ומפיק דו"ח HTML בעברית.
 *
 *   tsx bin/diff.ts --before reports/before.json --after reports/after.json \
 *                   --report reports/migration.json --out reports/diff.html
 */

import { Command } from "commander";
import path from "path";
import { promises as fs } from "fs";

import { writeHtmlDiffReport } from "../src/diff/index.js";
import type { CountMatchResult, IntegrityIssue } from "../src/validate/index.js";
import type { MigrationReport } from "../src/types.js";

const program = new Command();
program
  .name("schema-diff")
  .requiredOption("--before <path>", "JSON עם ספירות לפני")
  .requiredOption("--after <path>", "JSON עם ספירות אחרי")
  .option("--validation <path>", "JSON של validate (countMatch + integrity)")
  .option("--report <path>", "JSON של migration (לשגיאות)")
  .option("--out <path>", "פלט HTML", "reports/diff.html");

program.parse(process.argv);
const opts = program.opts();

(async () => {
  const before = JSON.parse(await fs.readFile(path.resolve(opts.before), "utf-8")) as Record<string, number>;
  const after = JSON.parse(await fs.readFile(path.resolve(opts.after), "utf-8")) as Record<string, number>;
  const validation = opts.validation
    ? (JSON.parse(await fs.readFile(path.resolve(opts.validation), "utf-8")) as {
        countMatches: CountMatchResult[];
        integrityIssues: IntegrityIssue[];
      })
    : { countMatches: [], integrityIssues: [] };
  const report = opts.report
    ? (JSON.parse(await fs.readFile(path.resolve(opts.report), "utf-8")) as MigrationReport)
    : ({ batchId: "", startedAt: "", finishedAt: "", errors: [] } as unknown as MigrationReport);

  await writeHtmlDiffReport(
    {
      batchId: report.batchId,
      startedAt: report.startedAt,
      finishedAt: report.finishedAt,
      beforeCounts: before,
      afterCounts: after,
      countMatches: validation.countMatches,
      integrityIssues: validation.integrityIssues,
      errors: report.errors ?? [],
    },
    path.resolve(opts.out),
  );
  // eslint-disable-next-line no-console
  console.log(`HTML diff: ${opts.out}`);
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
