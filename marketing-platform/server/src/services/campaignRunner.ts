import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { compileRules } from './segmentation.js';
import { queues } from './queue.js';

/** Launch a campaign — enqueue a send job for every member of its segment. */
export async function launchCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { variants: true, segment: true },
  });

  if (campaign.status === 'RUNNING' || campaign.status === 'COMPLETED') {
    throw new Error(`Campaign already ${campaign.status}`);
  }
  if (campaign.variants.length === 0) throw new Error('Campaign has no variants');

  // Build recipient list from segment
  const where = campaign.segment
    ? compileRules(campaign.segment.rules as any)
    : {};
  const leads = await prisma.lead.findMany({
    where: { ...where, status: { not: 'UNSUBSCRIBED' } },
    select: { id: true },
  });

  // A/B distribution
  const abConfig = (campaign.abConfig as any) ?? {};
  const useAb = abConfig.enabled === true && campaign.variants.length > 1;
  const totalWeight = campaign.variants.reduce((s, v) => s + v.weight, 0) || 1;

  let queued = 0;
  for (const lead of leads) {
    let variantId = campaign.variants[0].id;
    if (useAb) {
      const r = Math.random() * totalWeight;
      let acc = 0;
      for (const v of campaign.variants) {
        acc += v.weight;
        if (r <= acc) { variantId = v.id; break; }
      }
    }
    const variant = campaign.variants.find((v) => v.id === variantId)!;
    await queues.send.add('send-one', {
      leadId: lead.id,
      campaignId: campaign.id,
      variantId: variant.id,
      templateId: variant.templateId,
      channel: campaign.channel,
    });
    queued++;
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  logger.info('campaign launched', { campaignId, queued });
  return { queued };
}

/** Inspect campaign metrics and pick winning A/B variant. */
export async function resolveAbWinner(campaignId: string) {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { variants: true },
  });
  const metric = (campaign.abConfig as any)?.winnerMetric ?? 'click';

  const results = await Promise.all(
    campaign.variants.map(async (v) => {
      const totalSends = await prisma.messageSend.count({ where: { variantId: v.id } });
      const opens = await prisma.messageSend.count({ where: { variantId: v.id, openedAt: { not: null } } });
      const clicks = await prisma.messageSend.count({ where: { variantId: v.id, clickedAt: { not: null } } });
      const convs = await prisma.messageSend.count({ where: { variantId: v.id, convertedAt: { not: null } } });
      const value = metric === 'open' ? opens : metric === 'convert' ? convs : clicks;
      return { variant: v, totalSends, opens, clicks, convs, value };
    })
  );

  results.sort((a, b) => b.value - a.value);
  const winner = results[0]?.variant;
  if (winner) {
    await prisma.$transaction([
      prisma.campaignVariant.updateMany({ where: { campaignId }, data: { isWinner: false } }),
      prisma.campaignVariant.update({ where: { id: winner.id }, data: { isWinner: true } }),
    ]);
  }
  return { results, winnerId: winner?.id };
}
