/**
 * 30 לידים — UTM tracking + pipeline stages.
 */
import type { LeadStatus } from "@prisma/client";
import { did } from "../utils/ids.js";
import { randomFirstName, randomLastName, randomMobile } from "../utils/hebrew.js";
import { rand, randInt, pick, chance, randDecimal } from "../utils/rng.js";
import { daysAgo } from "../utils/dates.js";
import { scaled } from "../context.js";
import type { SeedContext } from "../context.js";
import type { SeededCustomer } from "./customers.js";

const SOURCES = [
  "google-ads",
  "facebook-ads",
  "instagram",
  "referral",
  "website-form",
  "wedding-fair",
  "phone-call",
  "whatsapp",
];

const UTM_CAMPAIGNS = [
  { source: "google", medium: "cpc", campaign: "wedding-2026" },
  { source: "facebook", medium: "social", campaign: "brit-summer" },
  { source: "instagram", medium: "social", campaign: "bar-mitzvah-spring" },
  { source: "newsletter", medium: "email", campaign: "passover-special" },
  { source: "google", medium: "organic", campaign: "homepage" },
];

const STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"];
const STATUS_WEIGHTS = [0.2, 0.2, 0.15, 0.15, 0.1, 0.1, 0.1];

function weightedStatus(): LeadStatus {
  const r = rand();
  let acc = 0;
  for (let i = 0; i < STATUSES.length; i++) {
    acc += STATUS_WEIGHTS[i];
    if (r < acc) return STATUSES[i];
  }
  return "NEW";
}

const LEAD_NOTES = [
  "מעוניינת לקבל הצעת מחיר לחתונה ב-200 אורחים",
  "ברית מילה ביום שלישי הקרוב, צריך אישור מהיר",
  "בר מצווה למאי 2026, רוצה לראות תפריט בשרי",
  "כנס חברה ל-150 איש, ארוחת בוקר וקפה",
  "אירוע צדקה לעמותה — האם יש הנחה למלכ\"ר?",
  "שאלות על תפריט פרווה לבת מצווה",
  "צריך הצעה לאירוע ראש השנה",
  "מעוניין בארוחת ערב לפסח לחברת הייטק",
];

export async function seedLeads(
  ctx: SeedContext,
  customers: SeededCustomer[],
  salesUserIds: string[],
): Promise<void> {
  const { prisma, tenantId, factor } = ctx;
  const total = scaled(30, factor);

  for (let i = 0; i < total; i++) {
    const id = did(`lead:${tenantId}:${i}`);
    const status = weightedStatus();
    const createdAt = daysAgo(randInt(0, 90));
    const utm = chance(0.7) ? pick(UTM_CAMPAIGNS) : null;
    const linkedCustomer = chance(0.4) ? pick(customers) : null;

    await prisma.lead.upsert({
      where: { id },
      update: { status },
      create: {
        id,
        tenantId,
        customerId: linkedCustomer?.id ?? null,
        source: pick(SOURCES),
        status,
        firstName: randomFirstName(),
        lastName: randomLastName(),
        email: `lead${i}@gmail.com`,
        phone: randomMobile(),
        estimatedValue: randDecimal(5000, 80000) as any,
        notes: pick(LEAD_NOTES),
        assignedTo: salesUserIds.length ? pick(salesUserIds) : null,
        contactedAt: status !== "NEW" ? daysAgo(randInt(0, 60)) : null,
        closedAt: status === "WON" || status === "LOST" ? daysAgo(randInt(0, 30)) : null,
        metadata: {
          utm: utm ? { source: utm.source, medium: utm.medium, campaign: utm.campaign } : null,
          eventType: pick(["wedding", "brit", "bar_mitzvah", "corporate", "conference"]),
          guestCount: randInt(20, 400),
        } as any,
        createdAt,
      },
    });
  }
}
