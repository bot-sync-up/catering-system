/**
 * import-menus.ts
 *
 * Onboarding script: import a full menu structure (categories + items + prices)
 * into a tenant from a CSV file.
 *
 * Usage:
 *   npx ts-node scripts/import-menus.ts \
 *       --file ./menu.csv \
 *       --tenant <tenant-slug> \
 *       --menu-name "Main Menu" \
 *       [--dry-run]
 *
 * CSV columns (UTF-8 with BOM):
 *   category, item_name, description, price, sku, allergens, tags,
 *   prep_time_min, image_url, is_active, kosher_level
 *
 *   - `allergens` and `tags`: pipe-separated, e.g. "gluten|dairy"
 *   - `kosher_level`: regular|mehadrin|dairy|meat|pareve
 *   - `is_active`: true|false (default true)
 */

import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import minimist from "minimist";

const prisma = new PrismaClient();

const MenuRowSchema = z.object({
  category: z.string().min(1).max(100),
  item_name: z.string().min(1).max(200),
  description: z.string().optional().or(z.literal("")),
  price: z.coerce.number().positive().max(100000),
  sku: z.string().optional().or(z.literal("")),
  allergens: z.string().optional().or(z.literal("")),
  tags: z.string().optional().or(z.literal("")),
  prep_time_min: z.coerce.number().int().min(0).max(720).default(15),
  image_url: z.string().url().optional().or(z.literal("")),
  is_active: z
    .string()
    .optional()
    .transform((v) => (v ?? "true").toLowerCase() !== "false"),
  kosher_level: z
    .enum(["regular", "mehadrin", "dairy", "meat", "pareve"])
    .default("regular"),
});

type MenuRow = z.infer<typeof MenuRowSchema>;

interface RunOptions {
  filePath: string;
  tenantSlug: string;
  menuName: string;
  dryRun: boolean;
}

function parseArgs(): RunOptions {
  const argv = minimist(process.argv.slice(2));
  if (!argv.file || !argv.tenant || !argv["menu-name"]) {
    console.error(
      "Usage: import-menus.ts --file <csv> --tenant <slug> --menu-name <name> [--dry-run]",
    );
    process.exit(1);
  }
  return {
    filePath: path.resolve(argv.file),
    tenantSlug: String(argv.tenant),
    menuName: String(argv["menu-name"]),
    dryRun: Boolean(argv["dry-run"]),
  };
}

function splitList(s: string | undefined): string[] {
  if (!s) return [];
  return s
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
}

async function loadCsv(
  filePath: string,
): Promise<{ valid: MenuRow[]; invalid: { row: Record<string, unknown>; error: string }[] }> {
  const raw = fs.readFileSync(filePath, "utf-8").replace(/^﻿/, "");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const valid: MenuRow[] = [];
  const invalid: { row: Record<string, unknown>; error: string }[] = [];

  for (const row of rows) {
    const result = MenuRowSchema.safeParse(row);
    if (result.success) valid.push(result.data);
    else
      invalid.push({
        row,
        error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
  }
  return { valid, invalid };
}

async function ensureMenu(tenantId: string, name: string) {
  return prisma.menu.upsert({
    where: { tenantId_name: { tenantId, name } },
    update: {},
    create: { tenantId, name, isActive: true },
  });
}

async function ensureCategory(menuId: string, name: string) {
  return prisma.menuCategory.upsert({
    where: { menuId_name: { menuId, name } },
    update: {},
    create: { menuId, name, sortOrder: 0 },
  });
}

async function importItems(
  tenantId: string,
  menuId: string,
  rows: MenuRow[],
  dryRun: boolean,
) {
  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const category = await ensureCategory(menuId, row.category);

    const data = {
      tenantId,
      menuId,
      categoryId: category.id,
      name: row.item_name,
      description: row.description || null,
      price: row.price,
      sku: row.sku || null,
      allergens: splitList(row.allergens),
      tags: splitList(row.tags),
      prepTimeMin: row.prep_time_min,
      imageUrl: row.image_url || null,
      isActive: row.is_active,
      kosherLevel: row.kosher_level,
    };

    const existing = row.sku
      ? await prisma.menuItem.findFirst({ where: { tenantId, sku: row.sku } })
      : await prisma.menuItem.findFirst({
          where: { tenantId, menuId, categoryId: category.id, name: row.item_name },
        });

    if (existing) {
      if (!dryRun) {
        await prisma.menuItem.update({ where: { id: existing.id }, data });
      }
      updated++;
    } else {
      if (!dryRun) {
        await prisma.menuItem.create({ data });
      }
      inserted++;
    }
  }

  return { inserted, updated };
}

async function writeErrors(
  invalid: { row: Record<string, unknown>; error: string }[],
  filePath: string,
) {
  if (invalid.length === 0) return;
  const outPath = path.join(path.dirname(filePath), "menu-errors.csv");
  const csv = stringify(
    invalid.map((i) => ({ ...i.row, _error: i.error })),
    { header: true },
  );
  fs.writeFileSync(outPath, "﻿" + csv, "utf-8");
  console.log(`Errors written to: ${outPath}`);
}

async function main() {
  const opts = parseArgs();
  console.log(`Importing menu from: ${opts.filePath}`);
  console.log(`Tenant: ${opts.tenantSlug} | Menu: ${opts.menuName}`);
  console.log(`Mode: ${opts.dryRun ? "DRY-RUN" : "WRITE"}`);

  const tenant = await prisma.tenant.findUnique({ where: { slug: opts.tenantSlug } });
  if (!tenant) throw new Error(`Tenant not found: ${opts.tenantSlug}`);

  const menu = await ensureMenu(tenant.id, opts.menuName);
  const { valid, invalid } = await loadCsv(opts.filePath);
  console.log(`Valid: ${valid.length}. Invalid: ${invalid.length}.`);

  const { inserted, updated } = await importItems(tenant.id, menu.id, valid, opts.dryRun);

  await writeErrors(invalid, opts.filePath);

  console.log("\n=== SUMMARY ===");
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated : ${updated}`);
  console.log(`Errors  : ${invalid.length}`);
  console.log("================\n");
}

main()
  .catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
