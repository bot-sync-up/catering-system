import { describe, it, expect } from "vitest";
import { DroneOrchestrator } from "../src/drone/DroneProvider.js";
import { ZiplineStubProvider } from "../src/drone/zipline-stub.js";
import { etaCalculator } from "../src/drone/etaCalculator.js";

describe("etaCalculator", () => {
  it("מינימום 5 דקות", () => {
    expect(etaCalculator(0.1)).toBe(5);
  });
  it("יחס סביר ל-30 ק\"מ ב-60 קמ\"ש = 34 דקות (30+4 overhead)", () => {
    expect(etaCalculator(30, { cruiseKmH: 60, overheadMinutes: 4 })).toBe(34);
  });
});

describe("ZiplineStubProvider", () => {
  it("דוחה משקל חורג", async () => {
    const p = new ZiplineStubProvider();
    const q = await p.quote({
      deliveryId: "D1",
      pickup: { lat: 32.0, lng: 34.78 },
      dropoff: { lat: 32.1, lng: 34.78 },
      weightKg: 999,
    });
    expect(q.available).toBe(false);
    expect(q.reasonHe).toMatch(/משקל/);
  });

  it("דוחה מרחק חורג", async () => {
    const p = new ZiplineStubProvider();
    const q = await p.quote({
      deliveryId: "D2",
      pickup: { lat: 31.0, lng: 34.78 },
      dropoff: { lat: 33.5, lng: 34.78 },
      weightKg: 1,
    });
    expect(q.available).toBe(false);
  });

  it("מצטט במצב תקין", async () => {
    const p = new ZiplineStubProvider();
    const q = await p.quote({
      deliveryId: "D3",
      pickup: { lat: 32.08, lng: 34.78 },
      dropoff: { lat: 32.09, lng: 34.79 },
      weightKg: 2,
    });
    expect(q.available).toBe(true);
    expect(q.priceIls).toBeGreaterThan(0);
  });
});

describe("DroneOrchestrator", () => {
  it("בוחר את ההצעה המהירה ביותר", async () => {
    const orch = new DroneOrchestrator([new ZiplineStubProvider()]);
    const best = await orch.bestQuote({
      deliveryId: "D",
      pickup: { lat: 32.08, lng: 34.78 },
      dropoff: { lat: 32.09, lng: 34.79 },
      weightKg: 1,
    });
    expect(best?.provider).toBe("zipline-stub");
  });
});
