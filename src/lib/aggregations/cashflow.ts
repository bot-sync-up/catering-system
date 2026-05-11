import { prisma } from '../prisma';
import { ReportFilter, officialWhere } from '../filters';
import { monthBuckets } from '../dates';
import { addMonths, startOfMonth, endOfMonth, format } from 'date-fns';

export interface CashflowRow {
  period: string;
  inflow: number;
  outflow: number;
  net: number;
  cumulative: number;
  isForecast?: boolean;
}

/**
 * Cashflow by month: paid invoices (inflow) - expenses (outflow).
 * Includes 6-month forward forecast using a simple linear regression on the last 12 months.
 */
export async function cashflow(filter: ReportFilter, forecastMonths = 6): Promise<CashflowRow[]> {
  const buckets = monthBuckets(filter.from, filter.to);
  const rows: CashflowRow[] = [];
  let cumulative = 0;

  for (const b of buckets) {
    const payAgg = await prisma.payment.aggregate({
      where: {
        paidAt: { gte: b.from, lte: b.to },
        ...officialWhere(filter.officialOnly),
      },
      _sum: { amount: true },
    });
    const inflow = Number(payAgg._sum.amount ?? 0);

    const expAgg = await prisma.expense.aggregate({
      where: {
        spentAt: { gte: b.from, lte: b.to },
        ...officialWhere(filter.officialOnly),
        ...(filter.category ? { category: filter.category } : {}),
      },
      _sum: { amount: true },
    });
    const outflow = Number(expAgg._sum.amount ?? 0);

    const net = inflow - outflow;
    cumulative += net;
    rows.push({ period: b.label, inflow, outflow, net, cumulative });
  }

  // ===== forecast =====
  if (forecastMonths > 0 && rows.length >= 3) {
    const sample = rows.slice(-Math.min(12, rows.length));
    const xs = sample.map((_, i) => i);
    const ysIn = sample.map(r => r.inflow);
    const ysOut = sample.map(r => r.outflow);
    const inSlope = slope(xs, ysIn);
    const inIntercept = intercept(xs, ysIn);
    const outSlope = slope(xs, ysOut);
    const outIntercept = intercept(xs, ysOut);

    let cursor = addMonths(startOfMonth(filter.to), 1);
    for (let i = 0; i < forecastMonths; i++) {
      const idx = sample.length + i;
      const fInflow = Math.max(0, inIntercept + inSlope * idx);
      const fOutflow = Math.max(0, outIntercept + outSlope * idx);
      const net = fInflow - fOutflow;
      cumulative += net;
      rows.push({
        period: format(cursor, 'yyyy-MM'),
        inflow: round(fInflow),
        outflow: round(fOutflow),
        net: round(net),
        cumulative: round(cumulative),
        isForecast: true,
      });
      cursor = addMonths(endOfMonth(cursor), 1);
    }
  }

  return rows;
}

function mean(a: number[]) { return a.reduce((s, x) => s + x, 0) / a.length; }
function slope(xs: number[], ys: number[]) {
  const mx = mean(xs), my = mean(ys);
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}
function intercept(xs: number[], ys: number[]) { return mean(ys) - slope(xs, ys) * mean(xs); }
function round(n: number) { return Math.round(n * 100) / 100; }
