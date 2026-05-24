/**
 * 30 אירועים: 15 עבר completed+invoiced+paid, 10 הווה in-progress, 5 עתיד scheduled.
 */
import type { EventStatus, EventType } from "@prisma/client";
import { did } from "../utils/ids.js";
import { daysAgo, daysFromNow, atTime } from "../utils/dates.js";
import { randInt, pick, chance, randDecimal } from "../utils/rng.js";
import { scaled } from "../context.js";
import { round2 } from "../utils/money.js";
import type { SeedContext } from "../context.js";
import type { SeededCustomer } from "./customers.js";
import type { SeededMenu } from "./menus.js";

interface EventPlan {
  bucket: "past" | "present" | "future";
  status: EventStatus;
  type: EventType;
  customerCategoryPreference: string[];
  menuKey: string;
  daysOffset: number;
  guestRange: [number, number];
  pricePerGuest: number;
}

const PLANS: EventPlan[] = [
  // past — completed (15)
  ...Array.from({ length: 3 }, (_, i) => ({ bucket: "past" as const, status: "COMPLETED" as EventStatus, type: "WEDDING" as EventType, customerCategoryPreference: ["wedding"], menuKey: "wedding-meat", daysOffset: -(15 + i * 18), guestRange: [180, 350] as [number, number], pricePerGuest: 380 })),
  ...Array.from({ length: 3 }, (_, i) => ({ bucket: "past" as const, status: "COMPLETED" as EventStatus, type: "BAR_MITZVAH" as EventType, customerCategoryPreference: ["bar_mitzvah"], menuKey: "bar-mitzvah-meat", daysOffset: -(10 + i * 15), guestRange: [80, 200] as [number, number], pricePerGuest: 280 })),
  ...Array.from({ length: 2 }, (_, i) => ({ bucket: "past" as const, status: "COMPLETED" as EventStatus, type: "BRIT_MILAH" as EventType, customerCategoryPreference: ["brit"], menuKey: "brit-dairy", daysOffset: -(8 + i * 12), guestRange: [60, 150] as [number, number], pricePerGuest: 145 })),
  ...Array.from({ length: 3 }, (_, i) => ({ bucket: "past" as const, status: "COMPLETED" as EventStatus, type: "CORPORATE" as EventType, customerCategoryPreference: ["hitech", "business"], menuKey: "breakfast-conference", daysOffset: -(20 + i * 22), guestRange: [50, 250] as [number, number], pricePerGuest: 95 })),
  ...Array.from({ length: 2 }, (_, i) => ({ bucket: "past" as const, status: "COMPLETED" as EventStatus, type: "CONFERENCE" as EventType, customerCategoryPreference: ["education", "healthcare"], menuKey: "breakfast-conference", daysOffset: -(25 + i * 30), guestRange: [100, 400] as [number, number], pricePerGuest: 95 })),
  ...Array.from({ length: 2 }, (_, i) => ({ bucket: "past" as const, status: "COMPLETED" as EventStatus, type: "BAT_MITZVAH" as EventType, customerCategoryPreference: ["bat_mitzvah"], menuKey: "bar-mitzvah-meat", daysOffset: -(11 + i * 20), guestRange: [70, 180] as [number, number], pricePerGuest: 280 })),

  // present — in-progress (10)
  ...Array.from({ length: 4 }, (_, i) => ({ bucket: "present" as const, status: "IN_PROGRESS" as EventStatus, type: "WEDDING" as EventType, customerCategoryPreference: ["wedding"], menuKey: "wedding-meat", daysOffset: i - 1, guestRange: [200, 400] as [number, number], pricePerGuest: 380 })),
  ...Array.from({ length: 2 }, (_, i) => ({ bucket: "present" as const, status: "CONFIRMED" as EventStatus, type: "ENGAGEMENT" as EventType, customerCategoryPreference: ["engagement"], menuKey: "birthday-pareve", daysOffset: i + 1, guestRange: [80, 150] as [number, number], pricePerGuest: 165 })),
  ...Array.from({ length: 2 }, (_, i) => ({ bucket: "present" as const, status: "CONFIRMED" as EventStatus, type: "CORPORATE" as EventType, customerCategoryPreference: ["hitech"], menuKey: "breakfast-conference", daysOffset: i + 2, guestRange: [100, 200] as [number, number], pricePerGuest: 95 })),
  ...Array.from({ length: 2 }, (_, i) => ({ bucket: "present" as const, status: "IN_PROGRESS" as EventStatus, type: "PRIVATE_PARTY" as EventType, customerCategoryPreference: ["private", "birthday"], menuKey: "birthday-pareve", daysOffset: i, guestRange: [30, 80] as [number, number], pricePerGuest: 165 })),

  // future — scheduled (5)
  ...Array.from({ length: 2 }, (_, i) => ({ bucket: "future" as const, status: "CONFIRMED" as EventStatus, type: "WEDDING" as EventType, customerCategoryPreference: ["wedding"], menuKey: "wedding-meat", daysOffset: 30 + i * 14, guestRange: [200, 400] as [number, number], pricePerGuest: 380 })),
  { bucket: "future" as const, status: "DRAFT" as EventStatus, type: "BAR_MITZVAH" as EventType, customerCategoryPreference: ["bar_mitzvah"], menuKey: "bar-mitzvah-meat", daysOffset: 45, guestRange: [80, 200] as [number, number], pricePerGuest: 280 },
  { bucket: "future" as const, status: "CONFIRMED" as EventStatus, type: "CORPORATE" as EventType, customerCategoryPreference: ["hitech", "education"], menuKey: "breakfast-conference", daysOffset: 60, guestRange: [100, 250] as [number, number], pricePerGuest: 95 },
  { bucket: "future" as const, status: "DRAFT" as EventStatus, type: "SHEVA_BRACHOT" as EventType, customerCategoryPreference: ["sheva_brachot", "wedding"], menuKey: "vip-tasting", daysOffset: 90, guestRange: [40, 80] as [number, number], pricePerGuest: 580 },
];

export interface SeededEvent {
  id: string;
  customerId: string;
  status: EventStatus;
  type: EventType;
  guestCount: number;
  totalPrice: number;
  startsAt: Date;
  endsAt: Date;
  menuKey: string;
  bucket: "past" | "present" | "future";
}

export async function seedEvents(
  ctx: SeedContext,
  customers: SeededCustomer[],
  menus: SeededMenu[],
): Promise<SeededEvent[]> {
  const { prisma, tenantId, factor } = ctx;
  const planned = PLANS.slice(0, scaled(PLANS.length, factor));
  const menuMap = new Map(menus.map((m) => [m.key, m]));
  const out: SeededEvent[] = [];

  // pool של לקוחות שכבר נקשרו
  const usedCustomers = new Set<string>();

  for (let i = 0; i < planned.length; i++) {
    const plan = planned[i];
    // למצוא לקוח מתאים
    const candidates = customers.filter((c) =>
      plan.customerCategoryPreference.includes((c as any).category),
    );
    const pool = candidates.length ? candidates : customers;
    let customer: SeededCustomer | undefined;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = pick(pool);
      if (!usedCustomers.has(candidate.id) || pool.length < 3) {
        customer = candidate;
        break;
      }
    }
    if (!customer) customer = pick(pool);
    usedCustomers.add(customer.id);

    const menu = menuMap.get(plan.menuKey);
    const startDate = plan.daysOffset < 0 ? daysAgo(-plan.daysOffset) : daysFromNow(plan.daysOffset);
    const startsAt = atTime(startDate, 18 + randInt(0, 2), randInt(0, 1) * 30);
    const endsAt = new Date(startsAt.getTime() + (4 + randInt(0, 3)) * 3_600_000);
    const guestCount = randInt(plan.guestRange[0], plan.guestRange[1]);
    const basePrice = round2(guestCount * plan.pricePerGuest);
    const discount = chance(0.3) ? round2(basePrice * randDecimal(0.03, 0.1, 3)) : 0;
    const totalPrice = round2(basePrice - discount);
    const paidAmount =
      plan.status === "COMPLETED" ? totalPrice :
      plan.status === "IN_PROGRESS" ? round2(totalPrice * 0.5) :
      plan.status === "CONFIRMED" ? round2(totalPrice * 0.25) :
      0;

    const id = did(`event:${tenantId}:${i}`);
    await prisma.event.upsert({
      where: { id },
      update: { status: plan.status },
      create: {
        id,
        tenantId,
        customerId: customer.id,
        menuId: menu?.id ?? null,
        type: plan.type,
        status: plan.status,
        title: titleFor(plan.type, customer.name),
        description: `${eventTypeLabel(plan.type)} עבור ${customer.name}`,
        startsAt,
        endsAt,
        guestCount,
        basePrice: basePrice as any,
        discount: discount as any,
        totalPrice: totalPrice as any,
        paidAmount: paidAmount as any,
        contractSignedAt: plan.status !== "DRAFT" ? daysAgo(randInt(7, 60)) : null,
        metadata: {
          source: "seed",
          venuePref: pick(["אולם השמש", "גן הוורדים", "אולמי גליל", "אצלנו במקום"]),
        } as any,
      },
    });

    out.push({
      id,
      customerId: customer.id,
      status: plan.status,
      type: plan.type,
      guestCount,
      totalPrice,
      startsAt,
      endsAt,
      menuKey: plan.menuKey,
      bucket: plan.bucket,
    });
  }

  return out;
}

function titleFor(type: EventType, customerName: string): string {
  const map: Record<EventType, string> = {
    WEDDING: "חתונה",
    BAR_MITZVAH: "בר מצווה",
    BAT_MITZVAH: "בת מצווה",
    BRIT_MILAH: "ברית מילה",
    ENGAGEMENT: "אירוסין",
    SHEVA_BRACHOT: "שבע ברכות",
    CORPORATE: "אירוע חברה",
    CONFERENCE: "כנס",
    PRIVATE_PARTY: "אירוע פרטי",
    OTHER: "אירוע",
  };
  return `${map[type]} - ${customerName}`;
}

function eventTypeLabel(type: EventType): string {
  return titleFor(type, "").replace(" - ", "");
}
