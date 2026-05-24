import { describe, it, expect } from "vitest";
import { DemandForecaster } from "../src/forecasting/DemandForecaster.js";
import {
  holidayDemandMultiplier,
  nearestHoliday,
} from "../src/forecasting/holidayCalendar.js";
import {
  seasonalMultiplier,
  dayOfWeekMultiplier,
} from "../src/forecasting/eventTypeSeasons.js";

describe("holidayCalendar", () => {
  it("מזהה חג ביום עצמו", () => {
    const passover2026 = new Date("2026-04-02");
    const near = nearestHoliday(passover2026, 1);
    expect(near?.holiday.name).toBe("פסח");
    expect(near?.daysUntil).toBe(0);
  });

  it("מקדם ביקוש לחג גבוה מ-1", () => {
    const passover = new Date("2026-04-02");
    expect(holidayDemandMultiplier(passover)).toBeGreaterThan(1.5);
  });

  it("מקדם רגיל לתאריך שאינו חג", () => {
    const mundane = new Date("2026-02-04");
    expect(holidayDemandMultiplier(mundane)).toBe(1.0);
  });
});

describe("seasonality", () => {
  it("חתונות שיא ביוני", () => {
    const june = new Date("2026-06-15");
    const dec = new Date("2026-12-15");
    expect(seasonalMultiplier("wedding", june)).toBeGreaterThan(
      seasonalMultiplier("wedding", dec),
    );
  });

  it("יום חמישי שיא, שבת מינימום", () => {
    const thu = new Date("2026-05-21"); // יום חמישי
    const sat = new Date("2026-05-23"); // שבת
    expect(dayOfWeekMultiplier(thu)).toBeGreaterThan(dayOfWeekMultiplier(sat));
  });
});

describe("DemandForecaster", () => {
  it("מחזיר נקודות חיזוי לטווח תאריכים", () => {
    const f = new DemandForecaster([
      {
        date: new Date("2025-06-15"),
        eventType: "wedding",
        guestCount: 200,
        items: [],
      },
      {
        date: new Date("2025-07-15"),
        eventType: "wedding",
        guestCount: 250,
        items: [],
      },
    ]);
    const points = f.forecastOrders({
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-06-07"),
      eventType: "wedding",
    });
    expect(points).toHaveLength(7);
    expect(points[0].predictedOrders).toBeGreaterThan(0);
    expect(points[0].confidence.lower).toBeLessThanOrEqual(
      points[0].predictedOrders,
    );
  });
});
