/**
 * 5 קמפיינים — עצמאות, פסח, תשרי, חתונות קיץ, בר מצווה.
 */
import type { CampaignStatus, NotificationChannel } from "@prisma/client";
import { did } from "../utils/ids.js";
import { randInt } from "../utils/rng.js";
import { daysAgo, daysFromNow } from "../utils/dates.js";
import type { SeedContext } from "../context.js";

interface CampaignSpec {
  key: string;
  name: string;
  description: string;
  channel: NotificationChannel;
  status: CampaignStatus;
  budget: number;
  startOffset: number;
  endOffset: number;
}

export const CAMPAIGNS: CampaignSpec[] = [
  { key: "atzmaut-2026", name: "מבצע יום העצמאות 2026", description: "תפריט מנגל מיוחד עם 15% הנחה", channel: "EMAIL", status: "COMPLETED", budget: 5000, startOffset: -45, endOffset: -20 },
  { key: "pesach-2026", name: "סדר פסח 2026", description: "תפריט פסח כשר לפסח מהדרין", channel: "WHATSAPP", status: "COMPLETED", budget: 12000, startOffset: -90, endOffset: -55 },
  { key: "tishrei-2026", name: "חגי תשרי 2026", description: "ראש השנה, סוכות, שמחת תורה", channel: "EMAIL", status: "ACTIVE", budget: 18000, startOffset: -10, endOffset: 60 },
  { key: "summer-weddings", name: "חתונות קיץ 2026", description: "5% הנחה לחתונות יוני-אוגוסט", channel: "INSTAGRAM" as any, status: "ACTIVE", budget: 25000, startOffset: -5, endOffset: 90 },
  { key: "bar-mitzvah-spring", name: "בר מצוות אביב", description: "חבילות מיוחדות לבר מצווה", channel: "SMS", status: "SCHEDULED", budget: 8000, startOffset: 7, endOffset: 60 },
];

export interface SeededCampaign extends CampaignSpec {
  id: string;
}

export async function seedCampaigns(ctx: SeedContext): Promise<SeededCampaign[]> {
  const { prisma, tenantId } = ctx;
  const out: SeededCampaign[] = [];

  for (const c of CAMPAIGNS) {
    const id = did(`campaign:${tenantId}:${c.key}`);
    const startsAt = c.startOffset < 0 ? daysAgo(-c.startOffset) : daysFromNow(c.startOffset);
    const endsAt = c.endOffset < 0 ? daysAgo(-c.endOffset) : daysFromNow(c.endOffset);

    const channel: NotificationChannel = (["EMAIL", "SMS", "WHATSAPP", "PUSH", "IN_APP"] as NotificationChannel[]).includes(c.channel as any)
      ? (c.channel as NotificationChannel)
      : "EMAIL";

    await prisma.campaign.upsert({
      where: { id },
      update: { status: c.status },
      create: {
        id,
        tenantId,
        name: c.name,
        description: c.description,
        channel,
        status: c.status,
        startsAt,
        endsAt,
        budget: c.budget as any,
        targetSegment: { ageMin: 25, ageMax: 65, cities: ["תל אביב", "חיפה", "ירושלים"] } as any,
        metrics: {
          impressions: randInt(5000, 50000),
          clicks: randInt(200, 3000),
          conversions: randInt(5, 50),
        } as any,
      },
    });
    out.push({ ...c, id });
  }

  return out;
}
