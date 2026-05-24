import type { PrismaClient } from '@prisma/client';

/**
 * Heuristic churn / upsell scoring.
 * - churnScore: rises with days since last contact, lost leads, no recent notes
 * - upsellScore: rises with won leads, recent positive engagement, VIP tag
 * Replace with ML model later — interface stays the same.
 */
export async function recomputeChurnAndUpsell(prisma: PrismaClient, customerId: string) {
  const c = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      leads: true,
      notesList: { orderBy: { createdAt: 'desc' }, take: 1 },
      tags: { include: { tag: true } },
    },
  });
  if (!c) return;

  const now = Date.now();
  const lastNoteAt = c.notesList[0]?.createdAt?.getTime() ?? 0;
  const lastContactAt = c.lastContact?.getTime() ?? lastNoteAt;
  const daysSinceContact = lastContactAt ? (now - lastContactAt) / 86400000 : 365;

  const wonLeads = c.leads.filter((l) => l.status === 'WON').length;
  const lostLeads = c.leads.filter((l) => l.status === 'LOST').length;
  const openLeads = c.leads.filter((l) => !['WON', 'LOST'].includes(l.status)).length;

  // churn: 0..1
  let churn = 0;
  churn += Math.min(daysSinceContact / 180, 1) * 0.5; // half from contact freshness
  churn += Math.min(lostLeads / Math.max(1, wonLeads + lostLeads), 1) * 0.3;
  churn += openLeads === 0 && wonLeads > 0 ? 0.2 : 0;
  churn = Math.max(0, Math.min(1, churn));

  // upsell: 0..1
  let upsell = 0;
  upsell += Math.min(wonLeads / 5, 1) * 0.5;
  upsell += daysSinceContact < 30 ? 0.2 : 0;
  upsell += c.tags.some((t) => t.tag.kind === 'VIP') ? 0.3 : 0;
  upsell = Math.max(0, Math.min(1, upsell));

  // LTV approximation
  const ltv = c.leads.filter((l) => l.status === 'WON').reduce((s, l) => s + l.value, 0);

  await prisma.customer.update({
    where: { id: customerId },
    data: { churnScore: churn, upsellScore: upsell, ltv },
  });
}
