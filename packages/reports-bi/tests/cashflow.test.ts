import { describe, it, expect, beforeEach } from "vitest";
import { Decimal } from "decimal.js";
import { buildCashflow } from "../src/aggregations/cashflow.js";
import { buildMockPrisma, type MockedPrisma } from "./helpers/mock-prisma.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

let prisma: MockedPrisma;
beforeEach(() => {
  prisma = buildMockPrisma();
});

describe("buildCashflow", () => {
  it("מחזיר actual + forecast למשך 6 חודשים", async () => {
    prisma.payment.findMany.mockResolvedValue([
      { paidAt: new Date("2025-06-15T00:00:00Z"), amount: new Decimal(10_000) as unknown as never },
      { paidAt: new Date("2025-07-15T00:00:00Z"), amount: new Decimal(11_000) as unknown as never },
      { paidAt: new Date("2025-08-15T00:00:00Z"), amount: new Decimal(12_000) as unknown as never },
    ] as never);
    prisma.expense.findMany.mockResolvedValue([
      { occurredAt: new Date("2025-06-10T00:00:00Z"), amount: new Decimal(3_000) as unknown as never },
    ] as never);
    prisma.payrollRecord.findMany.mockResolvedValue([] as never);
    prisma.event.findMany.mockResolvedValue([] as never);
    prisma.budgetCategory.findMany.mockResolvedValue([] as never);

    const points = await buildCashflow({
      tenantId: TENANT,
      historicalRange: {
        from: new Date("2025-06-01T00:00:00Z"),
        to: new Date("2025-08-31T23:59:59Z"),
      },
      forecastMonths: 6,
    });

    const actuals = points.filter((p) => p.kind === "actual");
    const forecasts = points.filter((p) => p.kind === "forecast");
    expect(actuals).toHaveLength(3);
    expect(forecasts).toHaveLength(6);
    // קונה מגמת עליה — חיזוי לחודש הבא יהיה > הממוצע ההיסטורי
    const last = actuals[actuals.length - 1]!;
    expect(last.inflow.toString()).toBe("12000");
  });

  it("מוסיף חוזים פתוחים (events CONFIRMED) ל-pipeline של forecast", async () => {
    prisma.payment.findMany.mockResolvedValue([] as never);
    prisma.expense.findMany.mockResolvedValue([] as never);
    prisma.payrollRecord.findMany.mockResolvedValue([] as never);
    prisma.event.findMany.mockResolvedValue([
      {
        startsAt: new Date("2025-09-15T00:00:00Z"),
        totalPrice: new Decimal(50_000) as unknown as never,
        paidAmount: new Decimal(10_000) as unknown as never,
      },
    ] as never);
    prisma.budgetCategory.findMany.mockResolvedValue([] as never);

    const points = await buildCashflow({
      tenantId: TENANT,
      historicalRange: {
        from: new Date("2025-06-01T00:00:00Z"),
        to: new Date("2025-08-31T23:59:59Z"),
      },
      forecastMonths: 6,
    });

    const sept = points.find((p) => p.label === "2025-09" && p.kind === "forecast")!;
    // pipeline = 50000 - 10000 = 40000 (לפחות, מעל הbase trend שהוא 0)
    expect(sept.inflow.toNumber()).toBeGreaterThanOrEqual(40_000);
  });

  it("מוסיף recurring outflows מ-BudgetCategory לכל חודש forecast", async () => {
    prisma.payment.findMany.mockResolvedValue([] as never);
    prisma.expense.findMany.mockResolvedValue([] as never);
    prisma.payrollRecord.findMany.mockResolvedValue([] as never);
    prisma.event.findMany.mockResolvedValue([] as never);
    prisma.budgetCategory.findMany.mockResolvedValue([
      { monthlyBudget: new Decimal(5_000) as unknown as never },
      { monthlyBudget: new Decimal(2_500) as unknown as never },
    ] as never);

    const points = await buildCashflow({
      tenantId: TENANT,
      historicalRange: {
        from: new Date("2025-06-01T00:00:00Z"),
        to: new Date("2025-08-31T23:59:59Z"),
      },
      forecastMonths: 3,
    });

    const forecasts = points.filter((p) => p.kind === "forecast");
    for (const f of forecasts) {
      expect(f.outflow.toNumber()).toBeGreaterThanOrEqual(7_500);
    }
  });
});
