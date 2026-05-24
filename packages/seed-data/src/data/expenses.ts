/**
 * הוצאות — מקושר לאירועים/רכבים וקטגוריות תקציב.
 */
import { did } from "../utils/ids.js";
import { randInt, pick, chance, randDecimal } from "../utils/rng.js";
import { daysAgo } from "../utils/dates.js";
import { scaled } from "../context.js";
import type { SeedContext } from "../context.js";
import type { SeededEvent } from "./events.js";
import type { SeededVehicle } from "./vehicles.js";
import type { SeededBudgetCategory } from "./coa.js";

const EXPENSE_TEMPLATES = [
  { category: "cogs-food", description: "רכישת ירקות שוק כרמל", min: 800, max: 3500 },
  { category: "cogs-food", description: "רכישת בשר משק חי", min: 2500, max: 9000 },
  { category: "cogs-food", description: "רכישת עוף מ-עוף טוב", min: 1500, max: 5000 },
  { category: "cogs-food", description: "רכישת חלב תנובה", min: 500, max: 2200 },
  { category: "cogs-food", description: "רכישת דגים", min: 1200, max: 4500 },
  { category: "cogs-disposables", description: "כלי חד\"פ - הזמנה חודשית", min: 1500, max: 4000 },
  { category: "cogs-beverages", description: "יין ומשקאות - אירוע", min: 2000, max: 8000 },
  { category: "opex-fuel", description: "תדלוק רכב משלוחים", min: 400, max: 800 },
  { category: "opex-maintenance", description: "טיפול תקופתי", min: 1200, max: 3500 },
  { category: "opex-utilities", description: "חשמל IEC", min: 1500, max: 3500 },
  { category: "opex-rent", description: "שכ\"ד מטבח אזה\"ת", min: 18000, max: 22000 },
  { category: "mkt-ads", description: "Google Ads", min: 1500, max: 4000 },
  { category: "mkt-ads", description: "Facebook Ads", min: 1000, max: 3500 },
];

export async function seedExpenses(
  ctx: SeedContext,
  events: SeededEvent[],
  vehicles: SeededVehicle[],
  budgetCats: SeededBudgetCategory[],
): Promise<void> {
  const { prisma, tenantId, factor } = ctx;
  const catMap = new Map(budgetCats.map((b) => [b.key, b]));
  const total = scaled(120, factor);

  for (let i = 0; i < total; i++) {
    const tpl = pick(EXPENSE_TEMPLATES);
    const cat = catMap.get(tpl.category);
    const amount = randDecimal(tpl.min, tpl.max);
    const category = chance(0.85) ? "OFFICIAL" : "UNOFFICIAL";
    const occurredAt = daysAgo(randInt(0, 180));

    const linkEvent = chance(0.3) && events.length ? pick(events) : null;
    const linkVehicle = tpl.category.startsWith("opex-fuel") || tpl.category.startsWith("opex-maintenance")
      ? (vehicles.length ? pick(vehicles) : null)
      : null;

    const id = did(`expense:${tenantId}:${i}`);
    await prisma.expense.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId,
        eventId: linkEvent?.id ?? null,
        vehicleId: linkVehicle?.id ?? null,
        budgetCatId: cat?.id ?? null,
        category,
        description: tpl.description,
        amount: amount as any,
        currency: "ILS",
        paymentMethod: pick(["CASH", "CREDIT_CARD", "BANK_TRANSFER", "BIT"]) as any,
        occurredAt,
        notes: chance(0.2) ? "חשבונית מצורפת" : null,
      },
    });
  }
}
