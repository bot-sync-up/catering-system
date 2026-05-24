/**
 * Accounts Receivable Aging — חובות לקוחות לפי גיל
 *
 * Buckets: 0-30 / 31-60 / 61-90 / 90+ ימים מאז issuedAt.
 * מקור הנתונים: Invoice עם paidAmount < totalAmount (OFFICIAL).
 * outstanding = totalAmount - paidAmount.
 */
import { Decimal } from "decimal.js";
import type { AgingBucket, AgingReport, TenantScope } from "../types.js";
import { getPrisma } from "../utils/prisma.js";
import { toDecimal } from "../utils/decimal.js";
import { daysBetween } from "../utils/dates.js";

export interface AgingOptions extends TenantScope {
  /** תאריך החתך — ברירת מחדל: עכשיו */
  asOf?: Date;
}

const BUCKETS: { name: AgingBucket["bucket"]; min: number; max: number }[] = [
  { name: "0-30", min: 0, max: 30 },
  { name: "31-60", min: 31, max: 60 },
  { name: "61-90", min: 61, max: 90 },
  { name: "90+", min: 91, max: Number.POSITIVE_INFINITY },
];

export async function buildAgingReport(opts: AgingOptions): Promise<AgingReport> {
  const prisma = getPrisma();
  const { tenantId } = opts;
  const asOf = opts.asOf ?? new Date();

  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      category: "OFFICIAL",
      status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
      issuedAt: { lte: asOf },
    },
    select: {
      id: true,
      issuedAt: true,
      totalAmount: true,
      paidAmount: true,
      customer: { select: { id: true, name: true, hebrewName: true } },
    },
  });

  const bucketTotals = new Map<AgingBucket["bucket"], { total: Decimal; count: number }>();
  for (const b of BUCKETS) bucketTotals.set(b.name, { total: new Decimal(0), count: 0 });

  const byCustomer = new Map<string, { name: string; total: Decimal; oldestDays: number }>();

  for (const inv of invoices) {
    const outstanding = toDecimal(inv.totalAmount).minus(toDecimal(inv.paidAmount));
    if (outstanding.lte(0)) continue;

    const days = daysBetween(inv.issuedAt, asOf);
    const b = BUCKETS.find((x) => days >= x.min && days <= x.max);
    if (!b) continue;

    const cur = bucketTotals.get(b.name)!;
    cur.total = cur.total.plus(outstanding);
    cur.count += 1;

    const cName = inv.customer.hebrewName ?? inv.customer.name;
    const c = byCustomer.get(inv.customer.id) ?? {
      name: cName,
      total: new Decimal(0),
      oldestDays: 0,
    };
    c.total = c.total.plus(outstanding);
    if (days > c.oldestDays) c.oldestDays = days;
    byCustomer.set(inv.customer.id, c);
  }

  return {
    asOf,
    buckets: BUCKETS.map((b) => ({
      bucket: b.name,
      total: bucketTotals.get(b.name)!.total,
      invoiceCount: bucketTotals.get(b.name)!.count,
    })),
    byCustomer: [...byCustomer.entries()]
      .map(([customerId, v]) => ({
        customerId,
        customerName: v.name,
        total: v.total,
        oldestDays: v.oldestDays,
      }))
      .sort((a, b) => b.total.cmp(a.total)),
  };
}
