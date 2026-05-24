import { prisma } from '../prisma';
import { ReportFilter, officialWhere } from '../filters';

export interface BreakdownRow {
  key: string;
  label: string;
  revenue: number;
  invoiceCount: number;
}

/**
 * Sales grouped by agent / customer / category using Prisma groupBy.
 */
export async function byAgent(filter: ReportFilter): Promise<BreakdownRow[]> {
  const grouped = await prisma.invoice.groupBy({
    by: ['agentId'],
    where: {
      issuedAt: { gte: filter.from, lte: filter.to },
      status: { not: 'VOID' },
      ...officialWhere(filter.officialOnly),
    },
    _sum: { subtotal: true },
    _count: { _all: true },
  });

  const agentIds = grouped.map(g => g.agentId).filter((x): x is string => !!x);
  const agents = await prisma.user.findMany({ where: { id: { in: agentIds } } });
  const map = new Map(agents.map(a => [a.id, a.name ?? a.email]));

  return grouped.map(g => ({
    key: g.agentId ?? 'unassigned',
    label: g.agentId ? (map.get(g.agentId) ?? 'unknown') : 'ללא סוכן',
    revenue: Number(g._sum.subtotal ?? 0),
    invoiceCount: g._count._all,
  })).sort((a, b) => b.revenue - a.revenue);
}

export async function byCustomer(filter: ReportFilter): Promise<BreakdownRow[]> {
  const grouped = await prisma.invoice.groupBy({
    by: ['customerId'],
    where: {
      issuedAt: { gte: filter.from, lte: filter.to },
      status: { not: 'VOID' },
      ...officialWhere(filter.officialOnly),
    },
    _sum: { subtotal: true },
    _count: { _all: true },
  });

  const customers = await prisma.customer.findMany({
    where: { id: { in: grouped.map(g => g.customerId) } },
  });
  const map = new Map(customers.map(c => [c.id, c.name]));

  return grouped.map(g => ({
    key: g.customerId,
    label: map.get(g.customerId) ?? 'unknown',
    revenue: Number(g._sum.subtotal ?? 0),
    invoiceCount: g._count._all,
  })).sort((a, b) => b.revenue - a.revenue);
}

export async function byCategory(filter: ReportFilter): Promise<BreakdownRow[]> {
  const grouped = await prisma.invoice.groupBy({
    by: ['category'],
    where: {
      issuedAt: { gte: filter.from, lte: filter.to },
      status: { not: 'VOID' },
      ...officialWhere(filter.officialOnly),
    },
    _sum: { subtotal: true },
    _count: { _all: true },
  });

  return grouped.map(g => ({
    key: g.category ?? 'uncategorized',
    label: g.category ?? 'ללא קטגוריה',
    revenue: Number(g._sum.subtotal ?? 0),
    invoiceCount: g._count._all,
  })).sort((a, b) => b.revenue - a.revenue);
}
