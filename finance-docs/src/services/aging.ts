// Aging report — buckets 0-30 / 31-60 / 61-90 / 90+.
import { prisma } from '../lib/db.js';

export interface AgingRow {
  customerId: string;
  customerName: string;
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90_plus: number;
  total: number;
}

export async function agingReport(orgId: string, asOf: Date = new Date()): Promise<AgingRow[]> {
  const docs = await prisma.document.findMany({
    where: {
      orgId,
      balance: { gt: 0 },
      status: { notIn: ['PAID', 'CANCELLED', 'CREDITED', 'DRAFT'] },
    },
    select: {
      customerId: true,
      balance: true,
      dueDate: true,
      issueDate: true,
      customer: { select: { name: true } },
    },
  });

  const map = new Map<string, AgingRow>();
  for (const d of docs) {
    const ref = d.dueDate ?? d.issueDate;
    const days = Math.max(0, Math.floor((asOf.getTime() - ref.getTime()) / (24 * 3600 * 1000)));
    const row = map.get(d.customerId) ?? {
      customerId: d.customerId,
      customerName: d.customer.name,
      bucket0_30: 0, bucket31_60: 0, bucket61_90: 0, bucket90_plus: 0,
      total: 0,
    };
    const bal = Number(d.balance);
    if (days <= 30) row.bucket0_30 += bal;
    else if (days <= 60) row.bucket31_60 += bal;
    else if (days <= 90) row.bucket61_90 += bal;
    else row.bucket90_plus += bal;
    row.total += bal;
    map.set(d.customerId, row);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
