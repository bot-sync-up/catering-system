#!/usr/bin/env node
/**
 * merge-migrations.ts
 *
 * Squashes a range of timestamped migration files (Prisma/Drizzle/Knex layout) into a single
 * baseline file. Designed to be idempotent — re-running produces the same merged content.
 *
 * Usage:
 *   tsx merge-migrations.ts \
 *      --src ./prisma/migrations \
 *      --out ./prisma/migrations/00000000000000_baseline/migration.sql \
 *      --upto 20251201000000
 *
 *   Add --dry-run to only print the merged content.
 *
 * After merging:
 *   1. Delete the merged source migrations folders.
 *   2. Mark the new baseline as already-applied on every existing DB:
 *      INSERT INTO _prisma_migrations(...) so it is not re-run.
 *   3. Update the application code that depended on the old per-step state, if any.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { argv, exit } from "node:process";

interface Args { src: string; out: string; upto?: string; dryRun: boolean; }

function parseArgs(): Args {
  const a: Partial<Args> = { dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--src")   a.src = argv[++i];
    else if (k === "--out") a.out = argv[++i];
    else if (k === "--upto") a.upto = argv[++i];
    else if (k === "--dry-run") a.dryRun = true;
  }
  if (!a.src || !a.out) {
    console.error("usage: merge-migrations.ts --src <dir> --out <file> [--upto <ts>] [--dry-run]");
    exit(1);
  }
  return a as Args;
}

const MIG_DIR = /^(\d{14})(_.*)?$/;

async function findMigrations(src: string, upto?: string) {
  const entries = await fs.readdir(src, { withFileTypes: true });
  const folders = entries
    .filter(e => e.isDirectory() && MIG_DIR.test(e.name))
    .map(e => ({ name: e.name, ts: e.name.match(MIG_DIR)![1] }))
    .filter(f => !upto || f.ts <= upto)
    .sort((a, b) => a.ts.localeCompare(b.ts));
  return folders;
}

async function main() {
  const args = parseArgs();
  const folders = await findMigrations(args.src, args.upto);
  if (folders.length === 0) {
    console.error("no migrations found");
    exit(1);
  }

  const header = [
    "-- AUTO-GENERATED baseline migration",
    `-- Squashed ${folders.length} migrations (${folders[0].name} .. ${folders.at(-1)!.name})`,
    `-- Generated: ${new Date().toISOString()}`,
    "-- DO NOT EDIT — re-run merge-migrations.ts to regenerate.",
    "",
  ].join("\n");

  const chunks: string[] = [header];
  for (const f of folders) {
    const sqlPath = path.join(args.src, f.name, "migration.sql");
    try {
      const sql = await fs.readFile(sqlPath, "utf8");
      chunks.push(`-- >>> ${f.name}`, sql.trimEnd(), `-- <<< ${f.name}`, "");
    } catch (err) {
      console.warn(`skip ${f.name}: ${(err as Error).message}`);
    }
  }

  const merged = chunks.join("\n");
  if (args.dryRun) {
    process.stdout.write(merged);
    return;
  }

  await fs.mkdir(path.dirname(args.out), { recursive: true });
  await fs.writeFile(args.out, merged, "utf8");
  console.log(`wrote ${args.out} (${folders.length} migrations, ${merged.length} bytes)`);
  console.log("\nNext steps:");
  console.log("  1. Verify with: psql -f <out> --dry-run-equivalent on a scratch DB");
  console.log("  2. Mark merged migrations as applied on every existing environment");
  console.log("  3. Remove the original migration folders in a follow-up commit");
}

main().catch(e => { console.error(e); exit(1); });
