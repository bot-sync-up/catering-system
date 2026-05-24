import { prisma } from '../prisma';
import { ReportFilter, officialWhere } from '../filters';
import { monthBuckets } from '../dates';

export interface PnLRow {
  period: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  netIncome: number;
  margin: number;
}

/**
 * P&L by month within range. Drill-down by agent/customer/category supported via filter.
 * Uses Prisma groupBy for performance.
 */
export async function pnlByPeriod(filter: ReportFilter): Promise<PnLRow[]> {
  const buckets = monthBuckets(filter.from, filter.to);
  const rows: PnLRow[] = [];

  for (const b of buckets) {
    const invoiceWhere: any = {
      issuedAt: { gte: b.from, lte: b.to },
      status: { not: 'VOID' },
      ...officialWhere(filter.officialOnly),
    };
    if (filter.agentId) invoiceWhere.agentId = filter.agentId;
    if (filter.customerId) invoiceWhere.customerId = filter.customerId;
    if (filter.category) invoiceWhere.category = filter.category;

    const revAgg = await prisma.invoice.aggregate({
      where: invoiceWhere,
      _sum: { subtotal: true },
    });
    const revenue = Number(revAgg._sum.subtotal ?? 0);

    const expWhere: any = {
      spentAt: { gte: b.from, lte: b.to },
      ...officialWhere(filter.officialOnly),
    };
    if (filter.category) expWhere.category = filter.category;

    // crude split: category starting with "COGS" treated as COGS, rest as OPEX
    const expensesGrouped = await prisma.expense.groupBy({
      by: ['category'],
      where: expWhere,
      _sum: { amount: true },
    });
    let cogs = 0, opex = 0;
    for (const e of expensesGrouped) {
      const amt = Number(e._sum.amount ?? 0);
      if (e.category?.toUpperCase().startsWith('COGS')) cogs += amt;
      else opex += amt;
    }

    const grossProfit = revenue - cogs;
    const netIncome = grossProfit - opex;
    const margin = revenue > 0 ? netIncome / revenue : 0;

    rows.push({
      period: b.label,
      revenue, cogs, grossProfit, opex, netIncome, margin,
    });
  }

  return rows;
}

/** Drill-down: return invoice/expense rows behind a single period bucket. */
export async function pnlDrillDown(filter: ReportFilter) {
  const where: any = {
    issuedAt: { gte: filter.from, lte: filter.to },
    status: { not: 'VOID' },
    ...officialWhere(filter.officialOnly),
  };
  if (filter.agentId) where.agentId = filter.agentId;
  if (filter.customerId) where.customerId = filter.customerId;
  if (filter.category) where.category = filter.category;

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { customer: true, agent: true },
      orderBy: { issuedAt: 'desc' },
      take: 500,
    }),
    prisma.expense.findMany({
      where: {
        spentAt: { gte: filter.from, lte: filter.to },
        ...(filter.category ? { category: filter.category } : {}),
        ...officialWhere(filter.officialOnly),
      },
      orderBy: { spentAt: 'desc' },
      take: 500,
    }),
  ]);

  return { invoices, expenses };
}
