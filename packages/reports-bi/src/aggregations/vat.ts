/**
 * VAT — דוח מע"מ חודשי/דו-חודשי
 *
 * שיעור מע"מ תקף 2025: 18%.
 * Output VAT (עסקאות): Invoice.taxAmount  – או Invoice.totalAmount/(1+rate)*rate אם taxAmount = 0
 * Input VAT (תשומות):  SupplierInvoice.vatAmount עבור category=OFFICIAL בלבד
 * Net VAT = output - input
 *
 * Filter: official-only (category=OFFICIAL).
 */
import { Decimal } from "decimal.js";
import type { VatBucket, TenantScope, DateRange } from "../types.js";
import { getPrisma } from "../utils/prisma.js";
import { bucketLabel, generateBuckets } from "../utils/dates.js";
import { toDecimal } from "../utils/decimal.js";

/** שיעור מע"מ תקף 2025 (18%) — ניתן להחליף לפרמטר אם המדינה תשנה */
export const VAT_RATE_2025 = 18;

export type VatPeriod = "monthly" | "bimonthly";

export interface VatOptions extends TenantScope {
  range: DateRange;
  period?: VatPeriod;
  rate?: number;
}

export async function buildVatReport(opts: VatOptions): Promise<VatBucket[]> {
  const prisma = getPrisma();
  const { tenantId, range } = opts;
  const period = opts.period ?? "monthly";
  const rate = opts.rate ?? VAT_RATE_2025;
  const rateFactor = new Decimal(rate).div(100);

  // === Output VAT — Invoices ===
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      category: "OFFICIAL",
      status: { in: ["SENT", "PAID", "PARTIALLY_PAID", "OVERDUE"] },
      issuedAt: { gte: range.from, lte: range.to },
    },
    select: { issuedAt: true, totalAmount: true, taxAmount: true },
  });

  // === Input VAT — Supplier Invoices ===
  // schema: taxAmount הוא שדה ה-VAT של ספקים. אם 0 — נחשב נטו מתוך totalAmount.
  const supplierInvoices = await prisma.supplierInvoice.findMany({
    where: {
      tenantId,
      category: "OFFICIAL",
      issuedAt: { gte: range.from, lte: range.to },
    },
    select: { issuedAt: true, taxAmount: true, totalAmount: true },
  });

  // === Bucketize ===
  const buckets = period === "monthly" ? monthlyBuckets(range) : bimonthlyBuckets(range);
  const outputByBucket = new Map<number, Decimal>();
  const inputByBucket = new Map<number, Decimal>();

  for (const inv of invoices) {
    const bs = findBucket(buckets, inv.issuedAt);
    if (!bs) continue;
    const tax = toDecimal(inv.taxAmount);
    const effective = tax.gt(0)
      ? tax
      : toDecimal(inv.totalAmount).div(new Decimal(1).plus(rateFactor)).mul(rateFactor);
    outputByBucket.set(bs.getTime(), (outputByBucket.get(bs.getTime()) ?? new Decimal(0)).plus(effective));
  }

  for (const si of supplierInvoices) {
    const bs = findBucket(buckets, si.issuedAt);
    if (!bs) continue;
    const tax = toDecimal(si.taxAmount);
    const effective = tax.gt(0)
      ? tax
      : toDecimal(si.totalAmount).div(new Decimal(1).plus(rateFactor)).mul(rateFactor);
    inputByBucket.set(bs.getTime(), (inputByBucket.get(bs.getTime()) ?? new Decimal(0)).plus(effective));
  }

  return buckets.map((bs) => {
    const outputVat = outputByBucket.get(bs.getTime()) ?? new Decimal(0);
    const inputVat = inputByBucket.get(bs.getTime()) ?? new Decimal(0);
    return {
      periodStart: bs,
      label: period === "monthly" ? bucketLabel(bs, "month") : bimonthlyLabel(bs),
      outputVat,
      inputVat,
      netVat: outputVat.minus(inputVat),
      rate,
    };
  });
}

function monthlyBuckets(range: DateRange): Date[] {
  return generateBuckets(range, "month");
}

function bimonthlyBuckets(range: DateRange): Date[] {
  // דו-חודשי: ינו-פבר, מרץ-אפר, מאי-יונ, יול-אוג, ספט-אוק, נוב-דצמ
  const months = generateBuckets(range, "month");
  return months.filter((m) => m.getMonth() % 2 === 0);
}

function bimonthlyLabel(bs: Date): string {
  const m = bs.getMonth();
  return `${bs.getFullYear()}-${String(m + 1).padStart(2, "0")}-${String(m + 2).padStart(2, "0")}`;
}

function findBucket(buckets: Date[], date: Date): Date | null {
  // מוצא את הbucket המתאים (תחילה <= date < next)
  for (let i = 0; i < buckets.length; i++) {
    const start = buckets[i]!;
    const end = buckets[i + 1] ?? new Date(8.64e15);
    if (date.getTime() >= start.getTime() && date.getTime() < end.getTime()) return start;
  }
  return null;
}
