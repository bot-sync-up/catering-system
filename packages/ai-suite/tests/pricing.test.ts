import { describe, it, expect } from "vitest";
import { DynamicPricer } from "../src/pricing/DynamicPricer.js";
import { explainDeterministic } from "../src/pricing/explain.js";

describe("DynamicPricer", () => {
  it("מחיר רגיל לאמצע שבוע ללא חגים", () => {
    const p = new DynamicPricer();
    const r = p.price({
      basePrice: 100,
      eventDate: new Date("2026-02-04"), // יום רביעי, פברואר
      quoteDate: new Date("2026-01-04"),
    });
    expect(r.finalPrice).toBeGreaterThan(0);
    expect(r.multiplier).toBeLessThan(1.6);
    expect(r.multiplier).toBeGreaterThan(0.75);
  });

  it("יום חמישי יקר יותר מיום שני", () => {
    const p = new DynamicPricer();
    const thu = p.price({
      basePrice: 100,
      eventDate: new Date("2026-05-21"), // חמישי
      quoteDate: new Date("2026-03-21"),
    });
    const mon = p.price({
      basePrice: 100,
      eventDate: new Date("2026-05-18"), // שני
      quoteDate: new Date("2026-03-18"),
    });
    expect(thu.finalPrice).toBeGreaterThan(mon.finalPrice);
  });

  it("הזמנה מוקדמת מקבלת הנחה", () => {
    const p = new DynamicPricer();
    const early = p.price({
      basePrice: 1000,
      eventDate: new Date("2026-12-01"),
      quoteDate: new Date("2026-06-01"), // 6 חודשים מראש
    });
    const late = p.price({
      basePrice: 1000,
      eventDate: new Date("2026-12-01"),
      quoteDate: new Date("2026-11-25"), // שבוע מראש
    });
    expect(early.finalPrice).toBeLessThan(late.finalPrice);
  });

  it("guards מונעים מחיר חריג מדי", () => {
    const p = new DynamicPricer();
    const r = p.price({
      basePrice: 100,
      eventDate: new Date("2026-04-02"), // פסח, חמישי
      quoteDate: new Date("2026-04-01"),
      competitorPosition: "cheaper_than_market",
    });
    expect(r.multiplier).toBeLessThanOrEqual(1.6);
  });

  it("explainDeterministic מחזיר טקסט בעברית", () => {
    const p = new DynamicPricer();
    const breakdown = p.price({
      basePrice: 500,
      eventDate: new Date("2026-05-21"),
      quoteDate: new Date("2026-03-21"),
    });
    const text = explainDeterministic(breakdown);
    expect(text).toContain("מחיר");
    expect(text).toContain("₪");
  });
});
