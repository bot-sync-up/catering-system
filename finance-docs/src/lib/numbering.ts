// Atomic, gap-free per-org/per-type document numbering.
import type { DocType, PrismaClient } from '@prisma/client';

export async function nextDocNumber(
  tx: PrismaClient | any,
  orgId: string,
  type: DocType,
): Promise<string> {
  // Upsert series row.
  let series = await tx.documentSeries.findUnique({
    where: { orgId_type: { orgId, type } },
  });
  if (!series) {
    series = await tx.documentSeries.create({
      data: { orgId, type, prefix: defaultPrefix(type), next: 1 },
    });
  }
  // Atomic increment.
  const updated = await tx.documentSeries.update({
    where: { id: series.id },
    data: { next: { increment: 1 } },
  });
  const n = updated.next - 1;
  return `${series.prefix}${String(n).padStart(5, '0')}`;
}

function defaultPrefix(t: DocType): string {
  switch (t) {
    case 'QUOTE': return 'QT-';
    case 'ORDER': return 'SO-';
    case 'PO': return 'PO-';
    case 'PROFORMA': return 'PF-';
    case 'TAX_INVOICE': return 'INV-';
    case 'TAX_INVOICE_RECEIPT': return 'INR-';
    case 'RECEIPT': return 'REC-';
    case 'CREDIT_NOTE': return 'CR-';
  }
}
