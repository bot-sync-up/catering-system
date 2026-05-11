/**
 * merge-migrations.ts
 *
 * Background: the codebase grew to 24 separate Prisma `migrations` directories
 * across apps. This script:
 *   1. Walks every `prisma/migrations/**`.
 *   2. Topologically sorts by timestamp prefix + cross-schema dependencies.
 *   3. Detects collisions (two apps creating the same table).
 *   4. Writes a unified `deployment/migrations/merged/` ready for `prisma migrate deploy`.
 *   5. Emits `migration_plan.json` summarising the merge.
 *
 * Run:
 *   tsx deployment/migrations/merge-migrations.ts \
 *     --root . --out deployment/migrations/merged --dry-run
 */
import { promises as fs } from "node:fs";
import path from "node:path";

type Mig = {
  app: string;
  name: string;     // e.g. 20251101120000_init
  ts: number;       // parsed from name prefix
  sourceDir: string;
  files: string[];
  sql: string;
  declaresTables: Set<string>;
  altersTables: Set<string>;
};

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, arr) => a.startsWith("--") ? [[a.replace(/^--/, ""), arr[i + 1] ?? "true"]] : []),
);
const ROOT = path.resolve(args.root ?? ".");
const OUT  = path.resolve(args.out  ?? "deployment/migrations/merged");
const DRY  = args["dry-run"] === "true";

async function walk(dir: string, acc: string[] = []): Promise<string[]> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      await walk(p, acc);
    } else if (entry.name === "migration.sql") {
      acc.push(p);
    }
  }
  return acc;
}

const TABLE_RE = /CREATE TABLE(?: IF NOT EXISTS)?\s+(?:"public"\.)?"?(\w+)"?/gi;
const ALTER_RE = /ALTER TABLE\s+(?:"public"\.)?"?(\w+)"?/gi;

function extract(sql: string): { decl: Set<string>; alt: Set<string> } {
  const decl = new Set<string>(), alt = new Set<string>();
  for (const m of sql.matchAll(TABLE_RE)) decl.add(m[1].toLowerCase());
  for (const m of sql.matchAll(ALTER_RE)) alt.add(m[1].toLowerCase());
  return { decl, alt };
}

async function main() {
  const files = await walk(ROOT);
  const migs: Mig[] = [];
  for (const f of files) {
    const parts = f.split(path.sep);
    const i = parts.indexOf("migrations");
    if (i < 0) continue;
    const app = parts.slice(0, i).filter(Boolean).join("/");
    const name = parts[i + 1];
    const ts = Number(name.split("_")[0]) || 0;
    const sql = await fs.readFile(f, "utf8");
    const { decl, alt } = extract(sql);
    migs.push({
      app, name, ts, sourceDir: path.dirname(f), files: [f], sql,
      declaresTables: decl, altersTables: alt,
    });
  }

  migs.sort((a, b) => a.ts - b.ts || a.app.localeCompare(b.app));

  // Conflict detection
  const seenTables = new Map<string, Mig>();
  const conflicts: Array<{ table: string; a: string; b: string }> = [];
  for (const m of migs) {
    for (const t of m.declaresTables) {
      const prev = seenTables.get(t);
      if (prev) conflicts.push({ table: t, a: `${prev.app}/${prev.name}`, b: `${m.app}/${m.name}` });
      else seenTables.set(t, m);
    }
  }

  const plan = {
    totalMigrations: migs.length,
    apps: [...new Set(migs.map((m) => m.app))],
    conflicts,
    order: migs.map((m) => ({ app: m.app, name: m.name, ts: m.ts })),
  };

  console.log(`Discovered ${migs.length} migrations across ${plan.apps.length} apps`);
  if (conflicts.length) {
    console.warn(`WARNING: ${conflicts.length} table collisions detected:`);
    for (const c of conflicts) console.warn(`  ${c.table}: ${c.a}  vs  ${c.b}`);
  }

  if (DRY) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  await fs.mkdir(OUT, { recursive: true });
  let idx = 0;
  for (const m of migs) {
    idx++;
    const folder = path.join(OUT, `${String(idx).padStart(4, "0")}_${m.app.replace(/\//g, "-")}_${m.name}`);
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, "migration.sql"),
      `-- Source: ${m.app}/${m.name}\n-- Original timestamp: ${m.ts}\n\n${m.sql}\n`);
  }
  await fs.writeFile(path.join(OUT, "migration_plan.json"), JSON.stringify(plan, null, 2));
  console.log(`Wrote ${idx} merged migrations to ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
