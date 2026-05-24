import { prisma } from '../prisma';
import { addMonths, startOfMonth, format, differenceInMonths } from 'date-fns';

export interface CohortRow {
  cohort: string;            // yyyy-MM of first purchase
  cohortSize: number;
  months: number[];          // index = months since first purchase
  retention: number[];       // 0..1 per month index
}

/**
 * Cohort retention analysis: groups customers by month of first paid invoice,
 * then computes the % of cohort that purchased again in each subsequent month.
 */
export async function cohortRetention(opts: {
  from: Date;
  to: Date;
  maxMonths?: number;
}): Promise<CohortRow[]> {
  const maxMonths = opts.maxMonths ?? 12;

  // 1. Find first-purchase date per customer
  const firstPurchases = await prisma.invoice.groupBy({
    by: ['customerId'],
    where: {
      issuedAt: { gte: opts.from, lte: opts.to },
      status: { not: 'VOID' },
    },
    _min: { issuedAt: true },
  });

  // 2. Bucket customers into cohorts by month
  const cohorts = new Map<string, Set<string>>();
  const customerCohort = new Map<string, string>();
  for (const fp of firstPurchases) {
    if (!fp._min.issuedAt) continue;
    const cohortKey = format(startOfMonth(fp._min.issuedAt), 'yyyy-MM');
    if (!cohorts.has(cohortKey)) cohorts.set(cohortKey, new Set());
    cohorts.get(cohortKey)!.add(fp.customerId);
    customerCohort.set(fp.customerId, cohortKey);
  }

  // 3. For each subsequent purchase, mark month offset
  const allInvoices = await prisma.invoice.findMany({
    where: {
      issuedAt: { gte: opts.from, lte: opts.to },
      status: { not: 'VOID' },
    },
    select: { customerId: true, issuedAt: true },
  });

  // monthIndex -> set of customers seen in that month for that cohort
  const seen = new Map<string, Map<number, Set<string>>>();
  for (const inv of allInvoices) {
    const cohort = customerCohort.get(inv.customerId);
    if (!cohort) continue;
    const cohortDate = new Date(`${cohort}-01T00:00:00Z`);
    const monthIdx = Math.max(0, differenceInMonths(inv.issuedAt, cohortDate));
    if (monthIdx > maxMonths) continue;
    if (!seen.has(cohort)) seen.set(cohort, new Map());
    const m = seen.get(cohort)!;
    if (!m.has(monthIdx)) m.set(monthIdx, new Set());
    m.get(monthIdx)!.add(inv.customerId);
  }

  // 4. Build retention table
  const rows: CohortRow[] = [];
  const sortedCohorts = Array.from(cohorts.keys()).sort();
  for (const cohort of sortedCohorts) {
    const size = cohorts.get(cohort)!.size;
    const months: number[] = [];
    const retention: number[] = [];
    for (let i = 0; i <= maxMonths; i++) {
      const count = seen.get(cohort)?.get(i)?.size ?? 0;
      months.push(count);
      retention.push(size > 0 ? Math.round((count / size) * 10000) / 10000 : 0);
    }
    rows.push({ cohort, cohortSize: size, months, retention });
  }
  return rows;
}

/**
 * Simple retention: % of last-period customers who returned this period.
 */
export async function simpleRetention(opts: {
  from: Date;
  to: Date;
}): Promise<{ returning: number; total: number; rate: number }> {
  const prevFrom = addMonths(opts.from, -1);
  const prevTo = addMonths(opts.to, -1);

  const [prev, curr] = await Promise.all([
    prisma.invoice.findMany({
      where: { issuedAt: { gte: prevFrom, lte: prevTo }, status: { not: 'VOID' } },
      select: { customerId: true },
      distinct: ['customerId'],
    }),
    prisma.invoice.findMany({
      where: { issuedAt: { gte: opts.from, lte: opts.to }, status: { not: 'VOID' } },
      select: { customerId: true },
      distinct: ['customerId'],
    }),
  ]);

  const prevIds = new Set(prev.map(p => p.customerId));
  const returning = curr.filter(c => prevIds.has(c.customerId)).length;
  const total = prevIds.size;
  return { returning, total, rate: total > 0 ? returning / total : 0 };
}
