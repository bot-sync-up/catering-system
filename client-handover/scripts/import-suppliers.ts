/**
 * import-suppliers.ts
 *
 * Onboarding script: import suppliers (and their products) into a tenant.
 *
 * Usage:
 *   npx ts-node scripts/import-suppliers.ts \
 *       --file ./suppliers.csv \
 *       --products ./supplier-products.csv \
 *       --tenant <tenant-slug> \
 *       [--dry-run]
 *
 * suppliers.csv columns:
 *   name, contact_name, phone, email, tax_id, address, city,
 *   payment_terms_days, currency, notes
 *
 * supplier-products.csv columns:
 *   supplier_name, sku, product_name, unit, price, min_order_qty, lead_time_days
 */

import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import minimist from "minimist";

const prisma = new PrismaClient();

const SupplierSchema = z.object({
  name: z.string().min(2).max(120),
  contact_name: z.string().optional().or(z.literal("")),
  phone: z.string().regex(/^0[0-9-]{8,12}$/, "phone format"),
  email: z.string().email().optional().or(z.literal("")),
  tax_id: z.string().regex(/^[0-9]{9}$/).optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  payment_terms_days: z.coerce.number().int().min(0).max(180).default(30),
  currency: z.string().default("ILS"),
  notes: z.string().optional().or(z.literal("")),
});

const ProductSchema = z.object({
  supplier_name: z.string().min(2),
  sku: z.string().min(1),
  product_name: z.string().min(1),
  unit: z.enum(["kg", "g", "l", "ml", "unit", "box", "pack"]).default("unit"),
  price: z.coerce.number().positive(),
  min_order_qty: z.coerce.number().int().min(1).default(1),
  lead_time_days: z.coerce.number().int().min(0).max(60).default(1),
});

type SupplierRow = z.infer<typeof SupplierSchema>;
type ProductRow = z.infer<typeof ProductSchema>;

interface RunOptions {
  suppliersPath: string;
  productsPath?: string;
  tenantSlug: string;
  dryRun: boolean;
}

function parseArgs(): RunOptions {
  const argv = minimist(process.argv.slice(2));
  if (!argv.file || !argv.tenant) {
    console.error(
      "Usage: import-suppliers.ts --file <csv> --tenant <slug> [--products <csv>] [--dry-run]",
    );
    process.exit(1);
  }
  return {
    suppliersPath: path.resolve(argv.file),
    productsPath: argv.products ? path.resolve(argv.products) : undefined,
    tenantSlug: String(argv.tenant),
    dryRun: Boolean(argv["dry-run"]),
  };
}

function loadCsv<T>(filePath: string, schema: z.ZodSchema<T>) {
  const raw = fs.readFileSync(filePath, "utf-8").replace(/^﻿/, "");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true }) as Record<
    string,
    string
  >[];

  const valid: T[] = [];
  const invalid: { row: Record<string, unknown>; error: string }[] = [];

  for (const row of rows) {
    const r = schema.safeParse(row);
    if (r.success) valid.push(r.data);
    else
      invalid.push({
        row,
        error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
  }
  return { valid, invalid };
}

async function importSuppliers(tenantId: string, rows: SupplierRow[], dryRun: boolean) {
  let inserted = 0;
  let updated = 0;
  const byName = new Map<string, string>();

  for (const row of rows) {
    const data = {
      tenantId,
      name: row.name,
      contactName: row.contact_name || null,
      phone: row.phone.replace(/[^0-9]/g, ""),
      email: row.email || null,
      taxId: row.tax_id || null,
      address: row.address || null,
      city: row.city || null,
      paymentTermsDays: row.payment_terms_days,
      currency: row.currency,
      notes: row.notes || null,
    };

    const existing = await prisma.supplier.findFirst({
      where: { tenantId, name: row.name },
    });

    if (existing) {
      if (!dryRun) await prisma.supplier.update({ where: { id: existing.id }, data });
      byName.set(row.name, existing.id);
      updated++;
    } else {
      if (!dryRun) {
        const created = await prisma.supplier.create({ data });
        byName.set(row.name, created.id);
      } else {
        byName.set(row.name, "dry-run-" + row.name);
      }
      inserted++;
    }
  }

  return { inserted, updated, byName };
}

async function importProducts(
  tenantId: string,
  rows: ProductRow[],
  supplierByName: Map<string, string>,
  dryRun: boolean,
) {
  let inserted = 0;
  let updated = 0;
  const orphans: ProductRow[] = [];

  for (const row of rows) {
    const supplierId = supplierByName.get(row.supplier_name);
    if (!supplierId) {
      orphans.push(row);
      continue;
    }

    const data = {
      tenantId,
      supplierId,
      sku: row.sku,
      name: row.product_name,
      unit: row.unit,
      price: row.price,
      minOrderQty: row.min_order_qty,
      leadTimeDays: row.lead_time_days,
    };

    const existing = await prisma.supplierProduct.findFirst({
      where: { tenantId, supplierId, sku: row.sku },
    });

    if (existing) {
      if (!dryRun) await prisma.supplierProduct.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      if (!dryRun) await prisma.supplierProduct.create({ data });
      inserted++;
    }
  }

  return { inserted, updated, orphans };
}

async function writeErrors(
  invalid: { row: Record<string, unknown>; error: string }[],
  filePath: string,
  suffix: string,
) {
  if (invalid.length === 0) return;
  const outPath = path.join(path.dirname(filePath), `errors-${suffix}.csv`);
  const csv = stringify(
    invalid.map((i) => ({ ...i.row, _error: i.error })),
    { header: true },
  );
  fs.writeFileSync(outPath, "﻿" + csv, "utf-8");
  console.log(`Errors written to: ${outPath}`);
}

async function main() {
  const opts = parseArgs();
  console.log(`Tenant: ${opts.tenantSlug} | Mode: ${opts.dryRun ? "DRY-RUN" : "WRITE"}`);

  const tenant = await prisma.tenant.findUnique({ where: { slug: opts.tenantSlug } });
  if (!tenant) throw new Error(`Tenant not found: ${opts.tenantSlug}`);

  const suppliers = loadCsv(opts.suppliersPath, SupplierSchema);
  console.log(`Suppliers: valid=${suppliers.valid.length} invalid=${suppliers.invalid.length}`);
  const sResult = await importSuppliers(tenant.id, suppliers.valid, opts.dryRun);
  await writeErrors(suppliers.invalid, opts.suppliersPath, "suppliers");

  let pResult = { inserted: 0, updated: 0, orphans: [] as ProductRow[] };
  if (opts.productsPath) {
    const products = loadCsv(opts.productsPath, ProductSchema);
    console.log(`Products: valid=${products.valid.length} invalid=${products.invalid.length}`);
    pResult = await importProducts(tenant.id, products.valid, sResult.byName, opts.dryRun);
    await writeErrors(products.invalid, opts.productsPath, "products");

    if (pResult.orphans.length > 0) {
      console.log(`Warning: ${pResult.orphans.length} products had no matching supplier.`);
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Suppliers inserted: ${sResult.inserted}`);
  console.log(`Suppliers updated : ${sResult.updated}`);
  if (opts.productsPath) {
    console.log(`Products inserted : ${pResult.inserted}`);
    console.log(`Products updated  : ${pResult.updated}`);
    console.log(`Products orphans  : ${pResult.orphans.length}`);
  }
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
