/**
 * import-existing-customers.ts
 *
 * Onboarding script: import existing customers from a CSV file into a tenant.
 *
 * Usage:
 *   npx ts-node scripts/import-existing-customers.ts \
 *       --file ./customers.csv \
 *       --tenant <tenant-slug> \
 *       [--dry-run] [--update-existing]
 *
 * CSV columns (UTF-8 with BOM, headers required):
 *   name, phone, email, tax_id, address, city, type, price_list, notes
 *
 * Behavior:
 *  - Validates each row (phone/email/tax_id format, type whitelist).
 *  - Deduplicates by (tenant_id, tax_id) and (tenant_id, phone).
 *  - Writes summary report + errors.csv with the offending rows.
 *  - Uses transactional batches of 100 to keep DB stable.
 */

import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import minimist from "minimist";

const prisma = new PrismaClient();

const CustomerRowSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z
    .string()
    .regex(/^0[0-9-]{8,12}$/, "phone must be Israeli format"),
  email: z.string().email().optional().or(z.literal("")),
  tax_id: z
    .string()
    .regex(/^[0-9]{9}$/, "tax_id must be 9 digits")
    .optional()
    .or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  type: z.enum(["private", "business", "institution"]).default("private"),
  price_list: z.string().optional().or(z.literal("Standard")),
  notes: z.string().optional().or(z.literal("")),
});

type CustomerRow = z.infer<typeof CustomerRowSchema>;

interface RunOptions {
  filePath: string;
  tenantSlug: string;
  dryRun: boolean;
  updateExisting: boolean;
}

function parseArgs(): RunOptions {
  const argv = minimist(process.argv.slice(2));
  if (!argv.file || !argv.tenant) {
    console.error(
      "Usage: import-existing-customers.ts --file <csv> --tenant <slug> [--dry-run] [--update-existing]",
    );
    process.exit(1);
  }
  return {
    filePath: path.resolve(argv.file),
    tenantSlug: String(argv.tenant),
    dryRun: Boolean(argv["dry-run"]),
    updateExisting: Boolean(argv["update-existing"]),
  };
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

async function getTenant(slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    throw new Error(`Tenant not found: ${slug}`);
  }
  return tenant;
}

async function loadAndValidate(filePath: string): Promise<{
  valid: CustomerRow[];
  invalid: { row: Record<string, unknown>; error: string }[];
}> {
  const raw = fs.readFileSync(filePath, "utf-8").replace(/^﻿/, "");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const valid: CustomerRow[] = [];
  const invalid: { row: Record<string, unknown>; error: string }[] = [];

  for (const row of rows) {
    const result = CustomerRowSchema.safeParse(row);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({
        row,
        error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }
  }

  return { valid, invalid };
}

async function importBatch(
  tenantId: string,
  batch: CustomerRow[],
  opts: RunOptions,
): Promise<{ inserted: number; updated: number; skipped: number }> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of batch) {
      const phone = normalizePhone(row.phone);
      const existing = await tx.customer.findFirst({
        where: {
          tenantId,
          OR: [
            row.tax_id ? { taxId: row.tax_id } : { id: "__never__" },
            { phone },
          ],
        },
      });

      const payload = {
        tenantId,
        name: row.name,
        phone,
        email: row.email || null,
        taxId: row.tax_id || null,
        address: row.address || null,
        city: row.city || null,
        type: row.type,
        priceList: row.price_list || "Standard",
        notes: row.notes || null,
      };

      if (existing) {
        if (opts.updateExisting && !opts.dryRun) {
          await tx.customer.update({ where: { id: existing.id }, data: payload });
          updated++;
        } else {
          skipped++;
        }
      } else {
        if (!opts.dryRun) {
          await tx.customer.create({ data: payload });
        }
        inserted++;
      }
    }
  });

  return { inserted, updated, skipped };
}

async function writeErrors(
  invalid: { row: Record<string, unknown>; error: string }[],
  filePath: string,
) {
  if (invalid.length === 0) return;
  const outPath = path.join(path.dirname(filePath), "errors.csv");
  const csv = stringify(
    invalid.map((i) => ({ ...i.row, _error: i.error })),
    { header: true },
  );
  fs.writeFileSync(outPath, "﻿" + csv, "utf-8");
  console.log(`Errors written to: ${outPath}`);
}

async function main() {
  const opts = parseArgs();
  console.log(`Importing from: ${opts.filePath}`);
  console.log(`Target tenant: ${opts.tenantSlug}`);
  console.log(`Mode: ${opts.dryRun ? "DRY-RUN" : "WRITE"}`);

  const tenant = await getTenant(opts.tenantSlug);
  const { valid, invalid } = await loadAndValidate(opts.filePath);
  console.log(`Parsed ${valid.length + invalid.length} rows.`);
  console.log(`Valid: ${valid.length}. Invalid: ${invalid.length}.`);

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  const BATCH = 100;
  for (let i = 0; i < valid.length; i += BATCH) {
    const slice = valid.slice(i, i + BATCH);
    const r = await importBatch(tenant.id, slice, opts);
    totalInserted += r.inserted;
    totalUpdated += r.updated;
    totalSkipped += r.skipped;
    console.log(
      `Batch ${i / BATCH + 1}: inserted=${r.inserted} updated=${r.updated} skipped=${r.skipped}`,
    );
  }

  await writeErrors(invalid, opts.filePath);

  console.log("\n=== SUMMARY ===");
  console.log(`Imported : ${totalInserted}`);
  console.log(`Updated  : ${totalUpdated}`);
  console.log(`Skipped  : ${totalSkipped} (duplicates)`);
  console.log(`Errors   : ${invalid.length}`);
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
