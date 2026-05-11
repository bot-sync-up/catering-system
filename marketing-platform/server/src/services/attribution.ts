import { prisma } from '../lib/prisma.js';

/**
 * Multi-touch attribution helpers.
 *
 * Two models supported:
 *  - last-touch: 100% credit to the most recent UTM touch before conversion
 *  - linear: equal credit split across all touches before conversion
 */

export type AttributionModel = 'last-touch' | 'linear' | 'first-touch';

export async function recordUtmTouch(input: {
  leadId: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrer?: string;
  landingPage?: string;
  ipAddress?: string;
  userAgent?: string;
  touchType?: 'VISIT' | 'CONVERSION' | 'REVENUE';
  cost?: number;
}) {
  return prisma.leadUtmTouch.create({ data: { ...input, touchType: input.touchType ?? 'VISIT' } });
}

export async function recordConversion(leadId: string, value?: number) {
  await prisma.leadUtmTouch.create({
    data: {
      leadId,
      touchType: value !== undefined ? 'REVENUE' : 'CONVERSION',
      cost: value,
    },
  });
}

/** Compute ROI per campaign over a date range. */
export async function campaignRoi(opts: { utmCampaign?: string; from?: Date; to?: Date }) {
  const { from, to, utmCampaign } = opts;
  const where: any = { utmCampaign: utmCampaign ?? undefined };
  if (from || to) where.createdAt = { gte: from, lte: to };

  const touches = await prisma.leadUtmTouch.findMany({ where });
  const revenue = touches
    .filter((t) => t.touchType === 'REVENUE')
    .reduce((s, t) => s + (t.cost ?? 0), 0);
  const visits = touches.filter((t) => t.touchType === 'VISIT').length;
  const conversions = touches.filter((t) => t.touchType === 'CONVERSION' || t.touchType === 'REVENUE').length;

  const adSpend = utmCampaign
    ? await prisma.adSpend.aggregate({
        where: { utmCampaign, date: from || to ? { gte: from, lte: to } : undefined },
        _sum: { spend: true, clicks: true, impressions: true, conversions: true },
      })
    : null;
  const spend = adSpend?._sum.spend ?? 0;

  return {
    utmCampaign,
    visits,
    conversions,
    revenue,
    spend,
    roi: spend > 0 ? (revenue - spend) / spend : null,
    cpc: adSpend?._sum.clicks ? spend / (adSpend._sum.clicks ?? 1) : null,
    cpa: conversions > 0 ? spend / conversions : null,
  };
}

/** Apply attribution credit across touches in a lead's journey. */
export async function attributeLead(leadId: string, model: AttributionModel = 'linear') {
  const touches = await prisma.leadUtmTouch.findMany({
    where: { leadId },
    orderBy: { createdAt: 'asc' },
  });
  const conversions = touches.filter((t) => t.touchType === 'CONVERSION' || t.touchType === 'REVENUE');
  if (conversions.length === 0) return { credits: [] };
  const conv = conversions[conversions.length - 1];
  const before = touches.filter((t) => t.createdAt <= conv.createdAt && t.touchType === 'VISIT');
  if (before.length === 0) return { credits: [] };

  const value = conv.cost ?? 1;
  let credits: { touchId: string; credit: number }[] = [];
  if (model === 'last-touch') {
    credits = [{ touchId: before[before.length - 1].id, credit: value }];
  } else if (model === 'first-touch') {
    credits = [{ touchId: before[0].id, credit: value }];
  } else {
    const share = value / before.length;
    credits = before.map((t) => ({ touchId: t.id, credit: share }));
  }
  return { credits };
}
