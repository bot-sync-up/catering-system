// DynamicPricer — מנוע תמחור דינמי
// קלט: מחיר בסיס + הקשר (תאריך, שכבת לקוח, lead time, תחרות)
// פלט: מחיר סופי + פירוט הסיבות

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import yaml from "yaml";
import { nearestHoliday } from "../forecasting/holidayCalendar.js";
import type { Customer } from "../shared/types.js";

export type CompetitorPosition =
  | "cheaper_than_market"
  | "on_par"
  | "more_expensive";

export interface PricingContext {
  basePrice: number;
  eventDate: Date;
  quoteDate: Date;
  customer?: Customer;
  competitorPosition?: CompetitorPosition;
}

export interface PriceBreakdown {
  basePrice: number;
  finalPrice: number;
  multiplier: number;
  factors: {
    dayOfWeek: number;
    season: number;
    holiday: number;
    customerTier: number;
    leadTime: number;
    competitor: number;
  };
  applied: Array<{ rule: string; factor: number; reason: string }>;
}

interface RulesFile {
  day_of_week: Array<{ day: number; factor: number; note?: string }>;
  season: Record<string, number>;
  holiday_proximity: Array<{
    days_before: number;
    factor: number;
    note?: string;
  }>;
  guest_tiers: Record<string, { factor: number; note?: string }>;
  lead_time: Array<{ days_min: number; factor: number; note?: string }>;
  competitor: Record<CompetitorPosition, number>;
  guards: { min_multiplier: number; max_multiplier: number };
}

let _rules: RulesFile | null = null;

function loadRules(): RulesFile {
  if (_rules) return _rules;
  const here = dirname(fileURLToPath(import.meta.url));
  const path = join(here, "rules.yaml");
  const raw = readFileSync(path, "utf-8");
  _rules = yaml.parse(raw) as RulesFile;
  return _rules;
}

export function setRules(rules: RulesFile): void {
  _rules = rules;
}

function seasonOf(date: Date): "spring" | "summer" | "autumn" | "winter" {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

export class DynamicPricer {
  private readonly rules: RulesFile;

  constructor(customRules?: RulesFile) {
    this.rules = customRules ?? loadRules();
  }

  price(ctx: PricingContext): PriceBreakdown {
    const applied: PriceBreakdown["applied"] = [];

    // יום בשבוע
    const dow = this.rules.day_of_week.find(
      (d) => d.day === ctx.eventDate.getDay(),
    );
    const dowFactor = dow?.factor ?? 1;
    if (dowFactor !== 1)
      applied.push({
        rule: "day_of_week",
        factor: dowFactor,
        reason: dow?.note ?? `יום ${ctx.eventDate.getDay()}`,
      });

    // עונה
    const season = seasonOf(ctx.eventDate);
    const seasonFactor = this.rules.season[season] ?? 1;
    if (seasonFactor !== 1)
      applied.push({
        rule: "season",
        factor: seasonFactor,
        reason: `עונת ${season}`,
      });

    // קרבת חג
    const near = nearestHoliday(ctx.eventDate, 14);
    let holidayFactor = 1;
    if (near && near.daysUntil >= 0 && near.holiday.demandImpact > 0) {
      const row = this.rules.holiday_proximity
        .slice()
        .sort((a, b) => a.days_before - b.days_before)
        .find((r) => near.daysUntil <= r.days_before);
      holidayFactor = row?.factor ?? 1;
      if (holidayFactor !== 1)
        applied.push({
          rule: "holiday",
          factor: holidayFactor,
          reason: `${near.holiday.name} בעוד ${near.daysUntil} ימים`,
        });
    }

    // שכבת לקוח
    const tier = ctx.customer?.segment ?? "medium";
    const tierFactor = this.rules.guest_tiers[tier]?.factor ?? 1;
    if (tierFactor !== 1)
      applied.push({
        rule: "customer_tier",
        factor: tierFactor,
        reason: `לקוח ${tier}`,
      });

    // זמן הזמנה
    const leadDays = Math.max(
      0,
      Math.round(
        (ctx.eventDate.getTime() - ctx.quoteDate.getTime()) / 86_400_000,
      ),
    );
    const ltRow = this.rules.lead_time
      .slice()
      .sort((a, b) => b.days_min - a.days_min)
      .find((r) => leadDays >= r.days_min);
    const leadFactor = ltRow?.factor ?? 1;
    if (leadFactor !== 1)
      applied.push({
        rule: "lead_time",
        factor: leadFactor,
        reason: `${leadDays} ימים מראש`,
      });

    // תחרות
    const compFactor = ctx.competitorPosition
      ? this.rules.competitor[ctx.competitorPosition]
      : 1;
    if (compFactor !== 1)
      applied.push({
        rule: "competitor",
        factor: compFactor,
        reason: `מיצוב: ${ctx.competitorPosition}`,
      });

    let mult =
      dowFactor *
      seasonFactor *
      holidayFactor *
      tierFactor *
      leadFactor *
      compFactor;

    // guards
    mult = Math.max(
      this.rules.guards.min_multiplier,
      Math.min(this.rules.guards.max_multiplier, mult),
    );

    return {
      basePrice: ctx.basePrice,
      finalPrice: Math.round(ctx.basePrice * mult * 100) / 100,
      multiplier: Math.round(mult * 1000) / 1000,
      factors: {
        dayOfWeek: dowFactor,
        season: seasonFactor,
        holiday: holidayFactor,
        customerTier: tierFactor,
        leadTime: leadFactor,
        competitor: compFactor,
      },
      applied,
    };
  }
}
