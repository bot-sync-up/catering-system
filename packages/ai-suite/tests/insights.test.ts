import { describe, it, expect } from "vitest";
import { CustomerSegmenter } from "../src/insights/customerSegmenter.js";
import { ChurnPredictor } from "../src/insights/churnPredictor.js";
import { UpsellRecommender } from "../src/insights/upsellRecommender.js";
import { LifetimeValueEstimator } from "../src/insights/lifetimeValueEstimator.js";
import type { Order } from "../src/shared/types.js";

const ord = (
  id: string,
  date: string,
  price: number,
  items: string[] = [],
): Order => ({
  id,
  customerId: "C1",
  eventDate: new Date(date),
  eventType: "wedding",
  guestCount: 100,
  items: items.map((m) => ({ menuItemId: m, quantity: 1 })),
  totalPrice: price,
  status: "delivered",
  createdAt: new Date(date),
});

describe("CustomerSegmenter", () => {
  it("champion: לקוח עם הרבה הזמנות יקרות לאחרונה", () => {
    const s = new CustomerSegmenter();
    const orders = [
      ord("1", "2026-04-01", 50000),
      ord("2", "2026-03-01", 60000),
      ord("3", "2026-02-01", 70000),
      ord("4", "2026-01-01", 55000),
      ord("5", "2025-12-01", 65000),
    ];
    const r = s.scoreCustomer(orders, new Date("2026-05-15"));
    expect(r?.segment).toBe("champions");
  });

  it("hibernating: לקוח ישן עם מעט הזמנות", () => {
    const s = new CustomerSegmenter();
    const orders = [ord("1", "2023-01-01", 3000)];
    const r = s.scoreCustomer(orders, new Date("2026-05-15"));
    expect(["hibernating", "lost"]).toContain(r?.segment);
  });
});

describe("ChurnPredictor", () => {
  it("ציון גבוה ללקוח שלא הזמין שנה", () => {
    const p = new ChurnPredictor();
    const orders = [ord("1", "2024-01-01", 30000)];
    const features = p.extractFeatures(orders, 0, new Date("2026-05-15"));
    const pred = p.predict(features);
    expect(pred.risk).not.toBe("low");
  });
});

describe("UpsellRecommender", () => {
  it("מציע פריטים שמופיעים יחד", () => {
    const r = new UpsellRecommender();
    r.train([
      ord("1", "2026-01-01", 0, ["A", "B"]),
      ord("2", "2026-02-01", 0, ["A", "B"]),
      ord("3", "2026-03-01", 0, ["A", "B"]),
      ord("4", "2026-04-01", 0, ["A"]),
    ]);
    const recs = r.recommendForBasket(["A"]);
    expect(recs[0].itemId).toBe("B");
  });
});

describe("LifetimeValueEstimator", () => {
  it("מחזיר LTV חיובי ללקוח קיים", () => {
    const e = new LifetimeValueEstimator();
    const orders = [
      ord("1", "2025-01-01", 30000),
      ord("2", "2025-07-01", 35000),
      ord("3", "2026-01-01", 40000),
    ];
    const r = e.estimate(orders);
    expect(r.ltvILS).toBeGreaterThan(0);
    expect(r.confidence).toBe("medium");
  });
});
