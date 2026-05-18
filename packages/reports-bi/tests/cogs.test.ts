import { describe, it, expect, beforeEach } from "vitest";
import { Decimal } from "decimal.js";
import { buildCogsPerEvent } from "../src/aggregations/cogs-per-event.js";
import { buildMockPrisma, type MockedPrisma } from "./helpers/mock-prisma.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

let prisma: MockedPrisma;
beforeEach(() => {
  prisma = buildMockPrisma();
});

describe("buildCogsPerEvent", () => {
  it("מחשב רווחיות + שולי רווח לאירוע יחיד עם ingredients ישירים", async () => {
    const eventId = "11111111-1111-1111-1111-111111111111";
    prisma.event.findMany.mockResolvedValue([
      {
        id: eventId,
        title: "חתונה כהן",
        startsAt: new Date("2026-04-10T18:00:00Z"),
        guestCount: 100,
        totalPrice: new Decimal(50_000) as unknown as never,
        orderItems: [],
        staffAssignments: [],
      },
    ] as never);

    prisma.inventoryMovement.findMany.mockResolvedValue([
      {
        reference: eventId,
        quantity: new Decimal(10) as unknown as never,
        unitCost: new Decimal(50) as unknown as never,
        product: { unitCost: new Decimal(50) },
      },
      {
        reference: eventId,
        quantity: new Decimal(5) as unknown as never,
        unitCost: new Decimal(20) as unknown as never,
        product: { unitCost: new Decimal(20) },
      },
    ] as never);

    prisma.timeEntry.findMany.mockResolvedValue([] as never);
    prisma.expense.findMany.mockResolvedValue([] as never);
    prisma.payrollRecord.findMany.mockResolvedValue([] as never);

    const rows = await buildCogsPerEvent({
      tenantId: TENANT,
      range: { from: new Date("2026-04-01"), to: new Date("2026-04-30") },
    });

    expect(rows).toHaveLength(1);
    // 10*50 + 5*20 = 600
    expect(rows[0]!.ingredientsCost.toString()).toBe("600");
    expect(rows[0]!.laborCost.toString()).toBe("0");
    expect(rows[0]!.revenue.toString()).toBe("50000");
    // marginPct = (50000 - 600 - 0 - 0) / 50000 * 100 = 98.8
    expect(rows[0]!.marginPct).toBeCloseTo(98.8, 1);
  });

  it("עובד עם labor cost מ-StaffAssignment fallback (ללא TimeEntry)", async () => {
    const eventId = "22222222-2222-2222-2222-222222222222";
    prisma.event.findMany.mockResolvedValue([
      {
        id: eventId,
        title: "בר מצווה",
        startsAt: new Date("2026-05-15T19:00:00Z"),
        guestCount: 50,
        totalPrice: new Decimal(20_000) as unknown as never,
        orderItems: [],
        staffAssignments: [
          {
            employeeId: "emp-1",
            hourlyRate: new Decimal(60) as unknown as never,
            startsAt: new Date("2026-05-15T16:00:00Z"),
            endsAt: new Date("2026-05-15T22:00:00Z"),
          },
        ],
      },
    ] as never);

    prisma.inventoryMovement.findMany.mockResolvedValue([] as never);
    prisma.timeEntry.findMany.mockResolvedValue([] as never);
    prisma.expense.findMany.mockResolvedValue([] as never);
    prisma.payrollRecord.findMany.mockResolvedValue([] as never);

    const rows = await buildCogsPerEvent({
      tenantId: TENANT,
      range: { from: new Date("2026-05-01"), to: new Date("2026-05-31") },
    });

    expect(rows).toHaveLength(1);
    // 6 שעות * 60 ש"ח = 360
    expect(rows[0]!.laborCost.toNumber()).toBeCloseTo(360, 0);
  });
});
