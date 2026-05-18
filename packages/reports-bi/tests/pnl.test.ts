import { describe, it, expect, beforeEach } from "vitest";
import { Decimal } from "decimal.js";
import { buildPnL, summarizePnL } from "../src/aggregations/pnl.js";
import { buildMockPrisma, type MockedPrisma } from "./helpers/mock-prisma.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

let prisma: MockedPrisma;
beforeEach(() => {
  prisma = buildMockPrisma();
});

describe("buildPnL", () => {
  it("מחשב Revenue/COGS/Gross/Opex/EBITDA חודשי לטווח של חודשיים", async () => {
    prisma.payment.findMany.mockResolvedValue([
      // ינואר
      { paidAt: new Date("2026-01-10T10:00:00Z"), amount: new Decimal(10_000) as unknown as never },
      { paidAt: new Date("2026-01-25T10:00:00Z"), amount: new Decimal(5_000) as unknown as never },
      // פברואר
      { paidAt: new Date("2026-02-15T10:00:00Z"), amount: new Decimal(20_000) as unknown as never },
    ] as never);

    prisma.inventoryMovement.findMany.mockResolvedValue([
      {
        occurredAt: new Date("2026-01-12T10:00:00Z"),
        quantity: new Decimal(10) as unknown as never,
        unitCost: new Decimal(100) as unknown as never,
        product: { unitCost: new Decimal(100) },
      },
      {
        occurredAt: new Date("2026-02-15T10:00:00Z"),
        quantity: new Decimal(5) as unknown as never,
        unitCost: new Decimal(200) as unknown as never,
        product: { unitCost: new Decimal(200) },
      },
    ] as never);

    prisma.expense.findMany.mockResolvedValue([
      { occurredAt: new Date("2026-01-05T10:00:00Z"), amount: new Decimal(2_000) as unknown as never },
      { occurredAt: new Date("2026-02-10T10:00:00Z"), amount: new Decimal(3_000) as unknown as never },
    ] as never);

    prisma.payrollRecord.findMany.mockResolvedValue([
      {
        periodStart: new Date("2026-01-01T00:00:00Z"),
        netPay: new Decimal(4_000) as unknown as never,
      },
    ] as never);

    const buckets = await buildPnL({
      tenantId: TENANT,
      period: "month",
      range: { from: new Date("2026-01-01"), to: new Date("2026-02-28") },
    });

    expect(buckets).toHaveLength(2);
    const jan = buckets.find((b) => b.label === "2026-01")!;
    const feb = buckets.find((b) => b.label === "2026-02")!;

    // ינואר: revenue=15000, cogs=10*100=1000, opex=2000+4000=6000
    expect(jan.revenue.toString()).toBe("15000");
    expect(jan.cogs.toString()).toBe("1000");
    expect(jan.grossMargin.toString()).toBe("14000");
    expect(jan.opex.toString()).toBe("6000");
    expect(jan.ebitda.toString()).toBe("8000");

    // פברואר: revenue=20000, cogs=5*200=1000, opex=3000
    expect(feb.revenue.toString()).toBe("20000");
    expect(feb.cogs.toString()).toBe("1000");
    expect(feb.opex.toString()).toBe("3000");
    expect(feb.ebitda.toString()).toBe("16000");
  });

  it("מחזיר אפסים כאשר אין נתונים", async () => {
    prisma.payment.findMany.mockResolvedValue([] as never);
    prisma.inventoryMovement.findMany.mockResolvedValue([] as never);
    prisma.expense.findMany.mockResolvedValue([] as never);
    prisma.payrollRecord.findMany.mockResolvedValue([] as never);

    const buckets = await buildPnL({
      tenantId: TENANT,
      period: "month",
      range: { from: new Date("2026-03-01"), to: new Date("2026-03-31") },
    });

    expect(buckets).toHaveLength(1);
    expect(buckets[0]!.revenue.toString()).toBe("0");
    expect(buckets[0]!.grossMarginPct).toBe(0);
    expect(buckets[0]!.ebitdaMarginPct).toBe(0);
  });

  it("summarizePnL מסכם נכון על פני באקטים", async () => {
    prisma.payment.findMany.mockResolvedValue([
      { paidAt: new Date("2026-01-10T10:00:00Z"), amount: new Decimal(100) as unknown as never },
      { paidAt: new Date("2026-02-10T10:00:00Z"), amount: new Decimal(200) as unknown as never },
    ] as never);
    prisma.inventoryMovement.findMany.mockResolvedValue([] as never);
    prisma.expense.findMany.mockResolvedValue([] as never);
    prisma.payrollRecord.findMany.mockResolvedValue([] as never);

    const buckets = await buildPnL({
      tenantId: TENANT,
      period: "month",
      range: { from: new Date("2026-01-01"), to: new Date("2026-02-28") },
    });
    const sum = summarizePnL(buckets);
    expect(sum.revenue.toString()).toBe("300");
  });

  it("מסנן UNOFFICIAL כברירת מחדל", async () => {
    prisma.payment.findMany.mockResolvedValue([] as never);
    prisma.inventoryMovement.findMany.mockResolvedValue([] as never);
    prisma.expense.findMany.mockResolvedValue([] as never);
    prisma.payrollRecord.findMany.mockResolvedValue([] as never);

    await buildPnL({
      tenantId: TENANT,
      period: "month",
      range: { from: new Date("2026-01-01"), to: new Date("2026-01-31") },
    });

    const call = prisma.payment.findMany.mock.calls[0]![0]!;
    expect(call.where).toMatchObject({ category: "OFFICIAL" });
  });
});
