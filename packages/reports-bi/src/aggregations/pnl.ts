/**
 * P&L — דוח רווח והפסד
 *
 * Revenue:    Payments(status=PAID, category=OFFICIAL) — או Invoice.totalAmount כאשר עוסקים בזכויות (accrual).
 * COGS:       InventoryMovement(type=OUT) × unit_cost  +  Recipe-driven consumption מאירועים.
 * Opex:       Expenses(category=OFFICIAL) + PayrollRecord.netPay(category=OFFICIAL)
 * GrossMargin = Revenue - COGS
 * EBITDA     = GrossMargin - Opex
 *
 * כל ה-Decimals מטופלים ב-decimal.js כדי למנוע איבוד דיוק.
 */
import { Decimal } from "decimal.js";
import type { Period, PnLBucket, TenantScope, DateRange } from "../types.js";
import { getPrisma } from "../utils/prisma.js";
import { bucketLabel, bucketStart, generateBuckets } from "../utils/dates.js";
import { pct, sumDecimals, toDecimal } from "../utils/decimal.js";

export interface PnLOptions extends TenantScope {
  period: Period;
  range: DateRange;
  /** האם לכלול UNOFFICIAL — ברירת מחדל false (דוחות רשמיים בלבד) */
  includeUnofficial?: boolean;
  /** האם להשתמש ב-accrual basis (Invoice issuedAt) במקום cash (Payment paidAt) */
  basis?: "cash" | "accrual";
}

interface AggregateRow {
  bucketStart: Date;
  revenue: Decimal;
  cogs: Decimal;
  opex: Decimal;
}

export async function buildPnL(opts: PnLOptions): Promise<PnLBucket[]> {
  const prisma = getPrisma();
  const { tenantId, period, range } = opts;
  const includeUnofficial = opts.includeUnofficial ?? false;
  const basis = opts.basis ?? "cash";

  const categoryFilter = includeUnofficial ? undefined : { category: "OFFICIAL" as const };

  // --- Revenue ---
  const revenueRows: { date: Date; amount: Decimal }[] = [];
  if (basis === "cash") {
    const payments = await prisma.payment.findMany({
      where: {
        tenantId,
        status: "PAID",
        paidAt: { gte: range.from, lte: range.to },
        ...(categoryFilter ?? {}),
      },
      select: { paidAt: true, amount: true },
    });
    for (const p of payments) {
      if (p.paidAt) revenueRows.push({ date: p.paidAt, amount: toDecimal(p.amount) });
    }
  } else {
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ["SENT", "PAID", "PARTIALLY_PAID", "OVERDUE"] },
        issuedAt: { gte: range.from, lte: range.to },
        ...(categoryFilter ?? {}),
      },
      select: { issuedAt: true, totalAmount: true },
    });
    for (const inv of invoices) {
      revenueRows.push({ date: inv.issuedAt, amount: toDecimal(inv.totalAmount) });
    }
  }

  // --- COGS ---
  // InventoryMovement type=OUT: quantity * unit_cost
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      tenantId,
      type: { in: ["OUT", "WASTE"] },
      occurredAt: { gte: range.from, lte: range.to },
    },
    select: {
      occurredAt: true,
      quantity: true,
      unitCost: true,
      product: { select: { unitCost: true } },
    },
  });
  const cogsRows: { date: Date; amount: Decimal }[] = movements.map((m) => {
    const unitCost = toDecimal(m.unitCost ?? m.product?.unitCost ?? 0);
    const qty = toDecimal(m.quantity).abs();
    return { date: m.occurredAt, amount: qty.mul(unitCost) };
  });

  // --- Opex ---
  const expenses = await prisma.expense.findMany({
    where: {
      tenantId,
      occurredAt: { gte: range.from, lte: range.to },
      ...(categoryFilter ?? {}),
    },
    select: { occurredAt: true, amount: true },
  });
  const opexRows: { date: Date; amount: Decimal }[] = expenses.map((e) => ({
    date: e.occurredAt,
    amount: toDecimal(e.amount),
  }));

  // Payroll (Opex)
  const payroll = await prisma.payrollRecord.findMany({
    where: {
      tenantId,
      periodStart: { gte: range.from, lte: range.to },
      ...(categoryFilter ?? {}),
    },
    select: { periodStart: true, netPay: true },
  });
  for (const p of payroll) {
    opexRows.push({ date: p.periodStart, amount: toDecimal(p.netPay) });
  }

  // --- Bucketize ---
  const aggMap = new Map<number, AggregateRow>();
  for (const bs of generateBuckets(range, period)) {
    aggMap.set(bs.getTime(), {
      bucketStart: bs,
      revenue: new Decimal(0),
      cogs: new Decimal(0),
      opex: new Decimal(0),
    });
  }
  const addTo = (rows: { date: Date; amount: Decimal }[], key: "revenue" | "cogs" | "opex") => {
    for (const r of rows) {
      const bs = bucketStart(r.date, period);
      const agg = aggMap.get(bs.getTime());
      if (agg) agg[key] = agg[key].plus(r.amount);
    }
  };
  addTo(revenueRows, "revenue");
  addTo(cogsRows, "cogs");
  addTo(opexRows, "opex");

  // --- Build buckets ---
  return [...aggMap.values()]
    .sort((a, b) => a.bucketStart.getTime() - b.bucketStart.getTime())
    .map((a) => {
      const grossMargin = a.revenue.minus(a.cogs);
      const ebitda = grossMargin.minus(a.opex);
      return {
        periodStart: a.bucketStart,
        label: bucketLabel(a.bucketStart, period),
        revenue: a.revenue,
        cogs: a.cogs,
        grossMargin,
        grossMarginPct: pct(grossMargin, a.revenue),
        opex: a.opex,
        ebitda,
        ebitdaMarginPct: pct(ebitda, a.revenue),
      };
    });
}

/** סיכום כולל של P&L לכל הטווח */
export function summarizePnL(buckets: PnLBucket[]): Omit<PnLBucket, "periodStart" | "label"> {
  const revenue = sumDecimals(buckets.map((b) => b.revenue));
  const cogs = sumDecimals(buckets.map((b) => b.cogs));
  const opex = sumDecimals(buckets.map((b) => b.opex));
  const grossMargin = revenue.minus(cogs);
  const ebitda = grossMargin.minus(opex);
  return {
    revenue,
    cogs,
    grossMargin,
    grossMarginPct: pct(grossMargin, revenue),
    opex,
    ebitda,
    ebitdaMarginPct: pct(ebitda, revenue),
  };
}
