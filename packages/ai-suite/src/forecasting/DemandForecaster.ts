// DemandForecaster — חיזוי ביקוש להזמנות ולמרכיבים
// אלגוריתם: seasonal decomposition (trend + seasonality + holiday + dow + noise) + EMA על נתוני עבר

import type { EventType, MenuItem } from "../shared/types.js";
import {
  seasonalMultiplier,
  dayOfWeekMultiplier,
} from "./eventTypeSeasons.js";
import { holidayDemandMultiplier } from "./holidayCalendar.js";

export interface HistoricalOrder {
  date: Date;
  eventType: EventType;
  guestCount: number;
  items: Array<{ menuItemId: string; quantity: number }>;
}

export interface ForecastPoint {
  date: Date;
  predictedOrders: number;
  confidence: { lower: number; upper: number };
  drivers: {
    baseline: number;
    seasonal: number;
    holiday: number;
    dayOfWeek: number;
  };
}

export interface IngredientForecast {
  ingredient: string;
  totalQuantity: number;
  unit: string;
}

export class DemandForecaster {
  private historicalDailyAverage = new Map<EventType, number>();
  private overallDailyBaseline = 0;
  private noiseStdDev = 0;

  constructor(history: HistoricalOrder[] = []) {
    if (history.length > 0) this.train(history);
  }

  /**
   * "אימון" — חישוב baseline ממוצע מההיסטוריה.
   * שיטה פשטנית אך עמידה: ממוצע יומי לסוג אירוע, מנורמל בעונתיות שכבר היתה באותו יום.
   */
  train(history: HistoricalOrder[]): void {
    if (history.length === 0) return;

    const byType = new Map<EventType, number[]>();
    for (const o of history) {
      const expected =
        seasonalMultiplier(o.eventType, o.date) *
        dayOfWeekMultiplier(o.date) *
        holidayDemandMultiplier(o.date);
      const normalized = expected > 0 ? 1 / expected : 1; // 1 הזמנה מנורמלת לבסיס
      const arr = byType.get(o.eventType) ?? [];
      arr.push(normalized);
      byType.set(o.eventType, arr);
    }
    for (const [t, arr] of byType) {
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      this.historicalDailyAverage.set(t, avg);
    }

    const dateBuckets = new Map<string, number>();
    for (const o of history) {
      const k = o.date.toISOString().slice(0, 10);
      dateBuckets.set(k, (dateBuckets.get(k) ?? 0) + 1);
    }
    const counts = Array.from(dateBuckets.values());
    this.overallDailyBaseline =
      counts.reduce((a, b) => a + b, 0) / Math.max(1, counts.length);
    const mean = this.overallDailyBaseline;
    const variance =
      counts.reduce((s, c) => s + (c - mean) ** 2, 0) /
      Math.max(1, counts.length);
    this.noiseStdDev = Math.sqrt(variance);
  }

  /**
   * חיזוי הזמנות יומי לטווח תאריכים.
   */
  forecastOrders(opts: {
    startDate: Date;
    endDate: Date;
    eventType?: EventType;
  }): ForecastPoint[] {
    const points: ForecastPoint[] = [];
    const baselinePerType =
      opts.eventType
        ? this.historicalDailyAverage.get(opts.eventType) ?? 1
        : this.overallDailyBaseline || 1;

    for (
      let d = new Date(opts.startDate);
      d <= opts.endDate;
      d = new Date(d.getTime() + 86_400_000)
    ) {
      const seasonal = opts.eventType
        ? seasonalMultiplier(opts.eventType, d)
        : averageSeasonal(d);
      const holiday = holidayDemandMultiplier(d);
      const dow = dayOfWeekMultiplier(d);
      const predicted = baselinePerType * seasonal * holiday * dow;

      // CI של 80% — z=1.28
      const halfWidth = 1.28 * this.noiseStdDev;
      points.push({
        date: new Date(d),
        predictedOrders: Math.max(0, predicted),
        confidence: {
          lower: Math.max(0, predicted - halfWidth),
          upper: predicted + halfWidth,
        },
        drivers: { baseline: baselinePerType, seasonal, holiday, dayOfWeek: dow },
      });
    }
    return points;
  }

  /**
   * תרגום חיזוי הזמנות לחיזוי מצרכים נדרשים.
   */
  forecastIngredients(opts: {
    forecast: ForecastPoint[];
    avgGuestsPerOrder: number;
    typicalMenu: MenuItem[];
    portionsPerKg?: Record<string, number>; // ברירת מחדל: 10 מנות לק"ג
  }): IngredientForecast[] {
    const portions = opts.portionsPerKg ?? {};
    const totals = new Map<string, number>();
    const totalGuests = opts.forecast.reduce(
      (s, p) => s + p.predictedOrders * opts.avgGuestsPerOrder,
      0,
    );
    for (const item of opts.typicalMenu) {
      for (const ing of item.ingredients) {
        const portionsForIng = portions[ing] ?? 10;
        const kg = totalGuests / portionsForIng / opts.typicalMenu.length;
        totals.set(ing, (totals.get(ing) ?? 0) + kg);
      }
    }
    return Array.from(totals.entries()).map(([ingredient, kg]) => ({
      ingredient,
      totalQuantity: Math.round(kg * 100) / 100,
      unit: "kg",
    }));
  }
}

function averageSeasonal(date: Date): number {
  const types: EventType[] = [
    "wedding",
    "bar_mitzvah",
    "brit",
    "corporate",
    "engagement",
    "memorial",
  ];
  return (
    types.reduce((s, t) => s + seasonalMultiplier(t, date), 0) / types.length
  );
}
