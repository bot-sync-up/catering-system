import { prisma } from '../prisma';
import { ReportFilter } from '../filters';
import { monthBuckets } from '../dates';

export interface VatRow {
  period: string;
  outputVat: number;    // VAT collected on sales
  inputVat: number;     // VAT paid on purchases
  payable: number;      // outputVat - inputVat (net to remit)
  salesBase: number;
  purchasesBase: number;
}

/**
 * VAT report (מע"מ). Always uses official-only data per Israeli tax requirements.
 */
export async function vatReport(filter: ReportFilter): Promise<VatRow[]> {
  const buckets = monthBuckets(filter.from, filter.to);
  const rows: VatRow[] = [];

  for (const b of buckets) {
    const sales = await prisma.invoice.aggregate({
      where: {
        issuedAt: { gte: b.from, lte: b.to },
        status: { not: 'VOID' },
        isOfficial: true,
      },
      _sum: { subtotal: true, vat: true },
    });
    const purchases = await prisma.expense.aggregate({
      where: {
        spentAt: { gte: b.from, lte: b.to },
        isOfficial: true,
      },
      _sum: { amount: true, vat: true },
    });

    const outputVat = Number(sales._sum.vat ?? 0);
    const inputVat = Number(purchases._sum.vat ?? 0);
    rows.push({
      period: b.label,
      outputVat,
      inputVat,
      payable: outputVat - inputVat,
      salesBase: Number(sales._sum.subtotal ?? 0),
      purchasesBase: Number(purchases._sum.amount ?? 0),
    });
  }
  return rows;
}
