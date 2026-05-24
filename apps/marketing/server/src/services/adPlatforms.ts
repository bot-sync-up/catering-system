import axios from 'axios';
import { env } from '../lib/env.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

/** Fetch spend by campaign from Meta Marketing API (FB+IG share the same endpoint). */
export async function syncMetaSpend(opts: { since?: Date; until?: Date } = {}) {
  if (!env.META_ACCESS_TOKEN || !env.META_AD_ACCOUNT_ID) {
    logger.warn('Meta not configured — sync skipped');
    return { inserted: 0 };
  }
  const since = (opts.since ?? new Date(Date.now() - 7 * 86400_000)).toISOString().slice(0, 10);
  const until = (opts.until ?? new Date()).toISOString().slice(0, 10);
  const url = `https://graph.facebook.com/v21.0/${env.META_AD_ACCOUNT_ID}/insights`;
  const res = await axios.get(url, {
    params: {
      access_token: env.META_ACCESS_TOKEN,
      level: 'campaign',
      fields: 'campaign_name,spend,clicks,impressions,actions,date_start',
      time_range: JSON.stringify({ since, until }),
      time_increment: 1,
      limit: 500,
    },
    timeout: 30_000,
  });

  const rows = res.data?.data ?? [];
  let inserted = 0;
  for (const r of rows) {
    const utmCampaign = r.campaign_name;
    const date = new Date(r.date_start);
    const spend = Number(r.spend ?? 0);
    const clicks = Number(r.clicks ?? 0);
    const impressions = Number(r.impressions ?? 0);
    const conversions = Array.isArray(r.actions)
      ? r.actions
          .filter((a: any) => a.action_type?.includes('purchase') || a.action_type === 'lead')
          .reduce((s: number, a: any) => s + Number(a.value ?? 0), 0)
      : 0;
    // Detect Instagram vs Facebook by publisher_platform when available; default FACEBOOK
    const platform = (r.publisher_platform === 'instagram') ? 'INSTAGRAM' : 'FACEBOOK';
    await prisma.adSpend.upsert({
      where: { platform_utmCampaign_date: { platform: platform as any, utmCampaign, date } },
      create: { platform: platform as any, utmCampaign, date, spend, clicks, impressions, conversions, raw: r },
      update: { spend, clicks, impressions, conversions, raw: r },
    });
    inserted++;
  }
  return { inserted };
}

/** Google Ads — simplified: rely on GAQL via REST. Caller must supply OAuth refresh token + dev token. */
export async function syncGoogleSpend(_opts: { since?: Date; until?: Date } = {}) {
  if (!env.GOOGLE_ADS_DEVELOPER_TOKEN || !env.GOOGLE_ADS_REFRESH_TOKEN) {
    logger.warn('Google Ads not configured — sync skipped');
    return { inserted: 0 };
  }
  // Stub: real implementation requires OAuth2 token exchange and GAQL query.
  // We provide the wiring so it can be expanded without changing the interface.
  logger.info('syncGoogleSpend: stub run');
  return { inserted: 0 };
}
