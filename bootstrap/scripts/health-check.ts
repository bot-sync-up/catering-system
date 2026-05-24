#!/usr/bin/env tsx
/**
 * health-check.ts — בדיקת בריאות מקיפה ל-monorepo F1
 *
 * בודק:
 *  1) חיבור Postgres + migrations
 *  2) חיבור Redis + ping
 *  3) Prisma client generated
 *  4) /health endpoint לכל app שזוהה
 *  5) Smoke test: create+fetch customer
 *
 * Usage:  tsx bootstrap/scripts/health-check.ts
 *         (מ-monorepo root, אחרי pnpm install + pnpm db:generate + docker-compose up)
 *
 * ENV:
 *   DATABASE_URL=postgresql://...
 *   REDIS_URL=redis://localhost:6379
 *   HEALTH_HOSTS=http://localhost:3000,http://localhost:3001,...
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type CheckResult = { name: string; ok: boolean; detail?: string; ms?: number };
const results: CheckResult[] = [];

function logResult(r: CheckResult) {
  const icon = r.ok ? "✅" : "❌";
  const ms = r.ms !== undefined ? `(${r.ms}ms)` : "";
  console.log(`${icon} ${r.name} ${ms} ${r.detail ?? ""}`);
  results.push(r);
}

async function timed<T>(name: string, fn: () => Promise<T>): Promise<T | undefined> {
  const t0 = Date.now();
  try {
    const v = await fn();
    logResult({ name, ok: true, ms: Date.now() - t0 });
    return v;
  } catch (err: any) {
    logResult({ name, ok: false, ms: Date.now() - t0, detail: err?.message ?? String(err) });
    return undefined;
  }
}

// ────────────────────────────────────────────────────────────────
// 1) Postgres
// ────────────────────────────────────────────────────────────────
async function checkPostgres() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    logResult({ name: "Postgres connect", ok: false, detail: "DATABASE_URL לא מוגדר" });
    return;
  }
  await timed("Postgres connect", async () => {
    const { Client } = await import("pg").catch(() => {
      throw new Error("pg לא מותקן (pnpm add -w pg)");
    });
    const client = new Client({ connectionString: url });
    await client.connect();
    const r = await client.query("SELECT version()");
    await client.end();
    return r.rows[0].version;
  });

  await timed("Postgres migrations applied", async () => {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: url });
    await client.connect();
    const r = await client.query(
      "SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1"
    );
    await client.end();
    if (r.rowCount === 0) throw new Error("טבלת _prisma_migrations ריקה");
    return `אחרונה: ${r.rows[0].migration_name}`;
  });
}

// ────────────────────────────────────────────────────────────────
// 2) Redis
// ────────────────────────────────────────────────────────────────
async function checkRedis() {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  await timed("Redis ping", async () => {
    const { default: Redis } = await import("ioredis").catch(() => {
      throw new Error("ioredis לא מותקן ברמת root");
    });
    const r = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
    await r.connect();
    const pong = await r.ping();
    await r.quit();
    if (pong !== "PONG") throw new Error(`ping החזיר ${pong}`);
    return "PONG";
  });
}

// ────────────────────────────────────────────────────────────────
// 3) Prisma client generated
// ────────────────────────────────────────────────────────────────
async function checkPrismaGenerated() {
  const root = process.cwd();
  const candidates = [
    "node_modules/.pnpm/@prisma+client@5.22.0/node_modules/@prisma/client/index.d.ts",
    "node_modules/@prisma/client/index.d.ts",
    "packages/db/node_modules/.prisma/client/index.d.ts",
  ];
  let found: string | undefined;
  for (const c of candidates) {
    if (existsSync(join(root, c))) { found = c; break; }
  }
  if (found) {
    logResult({ name: "Prisma client generated", ok: true, detail: found });
  } else {
    logResult({
      name: "Prisma client generated",
      ok: false,
      detail: "לא נמצא ב-node_modules. הרץ pnpm db:generate"
    });
  }
}

// ────────────────────────────────────────────────────────────────
// 4) HTTP /health של כל app
// ────────────────────────────────────────────────────────────────
async function checkHttpHealth() {
  const hosts =
    process.env.HEALTH_HOSTS?.split(",").map(s => s.trim()).filter(Boolean) ??
    discoverHealthHosts();

  for (const host of hosts) {
    const url = host.endsWith("/health") ? host : `${host.replace(/\/$/, "")}/health`;
    await timed(`HTTP ${url}`, async () => {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 5000);
      try {
        const r = await fetch(url, { signal: ctl.signal });
        if (!r.ok) throw new Error(`status ${r.status}`);
        const text = await r.text();
        return text.slice(0, 80);
      } finally {
        clearTimeout(t);
      }
    });
  }
}

function discoverHealthHosts(): string[] {
  // ברירת-מחדל: 3000-3010 שזה ה-Next apps + 4000-4002 שזה ה-services
  return [
    "http://localhost:3000", // web
    "http://localhost:3001", // crm / customer-portal
    "http://localhost:3002", // bi
    "http://localhost:3003", // orders
    "http://localhost:3004", // recipes
    "http://localhost:3005", // public-site
    "http://localhost:4000", // orchestrator
    "http://localhost:4001", // ocr-api
    "http://localhost:4002", // audit
  ];
}

// ────────────────────────────────────────────────────────────────
// 5) Smoke test — create+fetch customer
// ────────────────────────────────────────────────────────────────
async function smokeTestCustomer() {
  const apiBase = process.env.SMOKE_API_BASE ?? "http://localhost:3000/api";
  await timed("Smoke: POST /customers", async () => {
    const r = await fetch(`${apiBase}/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bootstrap Smoke Test",
        phone: "+972500000000",
        email: "smoke@bootstrap.local"
      })
    });
    if (!r.ok) throw new Error(`status ${r.status}: ${await r.text()}`);
    const { id } = await r.json();
    if (!id) throw new Error("חזר בלי id");

    const r2 = await fetch(`${apiBase}/customers/${id}`);
    if (!r2.ok) throw new Error(`fetch failed: ${r2.status}`);
    return `id=${id}`;
  });
}

// ────────────────────────────────────────────────────────────────
// 6) Workspace integrity — אין `*` deps לא-מטופלים
// ────────────────────────────────────────────────────────────────
async function checkWorkspaceIntegrity() {
  await timed("Workspace integrity (no stale '*' deps)", async () => {
    const root = process.cwd();
    const broken: string[] = [];
    const walk = (dir: string, depth: number) => {
      if (depth > 5) return;
      const fs = require("node:fs") as typeof import("node:fs");
      let ents: any[];
      try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of ents) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === "node_modules" || e.name.startsWith(".")) continue;
          const pj = join(p, "package.json");
          if (fs.existsSync(pj)) {
            const data = JSON.parse(fs.readFileSync(pj, "utf8"));
            for (const f of ["dependencies", "devDependencies"]) {
              if (!data[f]) continue;
              for (const [d, v] of Object.entries(data[f] as Record<string, string>)) {
                if (v === "*") broken.push(`${data.name || pj} → ${d}@*`);
              }
            }
          }
          walk(p, depth + 1);
        }
      }
    };
    walk(join(root, "apps"), 0);
    walk(join(root, "packages"), 0);
    walk(join(root, "services"), 0);
    if (broken.length) throw new Error(`${broken.length} בעיות: ${broken.slice(0, 3).join(", ")}`);
    return "OK";
  });
}

// ────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  F1 Monorepo Health Check");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log();

  await checkWorkspaceIntegrity();
  await checkPrismaGenerated();
  await checkPostgres();
  await checkRedis();
  await checkHttpHealth();
  if (process.env.SMOKE === "1") await smokeTestCustomer();

  console.log();
  const failed = results.filter(r => !r.ok);
  const passed = results.length - failed.length;
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  ${passed}/${results.length} בדיקות עברו`);
  if (failed.length) {
    console.log();
    console.log("  כשלים:");
    for (const f of failed) console.log(`    ❌ ${f.name}: ${f.detail ?? ""}`);
  }
  console.log("═══════════════════════════════════════════════════════════════");

  process.exit(failed.length ? 1 : 0);
}

main().catch(err => {
  console.error("FATAL", err);
  process.exit(2);
});
