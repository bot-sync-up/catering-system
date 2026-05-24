/**
 * CLI להרצת דוחות ad-hoc — `pnpm report:run`
 *
 * דוגמאות:
 *   tsx src/cli/run-report.ts pnl   --tenant=<uuid> --from=2026-01-01 --to=2026-12-31 --period=month
 *   tsx src/cli/run-report.ts vat   --tenant=<uuid> --from=2026-01-01 --to=2026-12-31
 *   tsx src/cli/run-report.ts cash  --tenant=<uuid>
 *   tsx src/cli/run-report.ts aging --tenant=<uuid>
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { addMonths } from "date-fns";
import { buildPnL } from "../aggregations/pnl.js";
import { buildVatReport } from "../aggregations/vat.js";
import { buildCashflow } from "../aggregations/cashflow.js";
import { buildAgingReport } from "../aggregations/aging.js";
import { buildPnLExcel, buildVatExcel, buildCashflowExcel, buildAgingExcel } from "../reports/excel-builder.js";
import { disconnect } from "../utils/prisma.js";

interface Args {
  command: string;
  tenant: string;
  from?: Date;
  to?: Date;
  period?: "month" | "quarter" | "year";
  out?: string;
}

function parseArgs(): Args {
  const [, , command, ...rest] = process.argv;
  const flags = Object.fromEntries(
    rest
      .filter((s) => s.startsWith("--"))
      .map((s) => {
        const [k, v] = s.replace(/^--/, "").split("=");
        return [k!, v ?? "true"];
      }),
  );
  return {
    command: command ?? "",
    tenant: String(flags.tenant ?? ""),
    from: flags.from ? new Date(String(flags.from)) : undefined,
    to: flags.to ? new Date(String(flags.to)) : undefined,
    period: (flags.period as Args["period"]) ?? "month",
    out: flags.out ? String(flags.out) : undefined,
  };
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (!args.tenant) throw new Error("--tenant=<uuid> required");

  const today = new Date();
  const from = args.from ?? addMonths(today, -12);
  const to = args.to ?? today;

  let buffer: Buffer;
  let suggestedName: string;

  switch (args.command) {
    case "pnl": {
      const buckets = await buildPnL({
        tenantId: args.tenant,
        period: args.period ?? "month",
        range: { from, to },
      });
      buffer = await buildPnLExcel({ buckets, periodLabel: `${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}` });
      suggestedName = `pnl_${args.tenant}.xlsx`;
      break;
    }
    case "vat": {
      const buckets = await buildVatReport({ tenantId: args.tenant, range: { from, to } });
      buffer = await buildVatExcel({ buckets, rate: 18 });
      suggestedName = `vat_${args.tenant}.xlsx`;
      break;
    }
    case "cash": {
      const points = await buildCashflow({
        tenantId: args.tenant,
        historicalRange: { from, to },
        forecastMonths: 6,
      });
      buffer = await buildCashflowExcel(points);
      suggestedName = `cashflow_${args.tenant}.xlsx`;
      break;
    }
    case "aging": {
      const report = await buildAgingReport({ tenantId: args.tenant });
      buffer = await buildAgingExcel(report);
      suggestedName = `aging_${args.tenant}.xlsx`;
      break;
    }
    default:
      throw new Error(`Unknown command: ${args.command}. Use: pnl|vat|cash|aging`);
  }

  const out = args.out ?? path.join(process.cwd(), suggestedName);
  await writeFile(out, buffer);
  console.log(`[reports-bi] wrote ${out} (${buffer.length} bytes)`);
  await disconnect();
}

main().catch((err) => {
  console.error("[reports-bi] error:", err);
  process.exit(1);
});
