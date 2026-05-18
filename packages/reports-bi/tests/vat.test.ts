import { describe, it, expect, beforeEach } from "vitest";
import { Decimal } from "decimal.js";
import { buildVatReport, VAT_RATE_2025 } from "../src/aggregations/vat.js";
import { buildMockPrisma, type MockedPrisma } from "./helpers/mock-prisma.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

let prisma: MockedPrisma;
beforeEach(() => {
  prisma = buildMockPrisma();
});

describe("buildVatReport", () => {
  it("שיעור מע\"מ ברירת מחדל הוא 18% (2025)", () => {
    expect(VAT_RATE_2025).toBe(18);
  });

  it("מסכם output - input ל-netVat חודשי", async () => {
    prisma.invoice.findMany.mockResolvedValue([
      {
        issuedAt: new Date("2026-01-15T00:00:00Z"),
        totalAmount: new Decimal(11_800) as unknown as never,
        taxAmount: new Decimal(1_800) as unknown as never,
        vatRate: new Decimal(18) as unknown as never,
      },
    ] as never);
    prisma.supplierInvoice.findMany.mockResolvedValue([
      {
        issuedAt: new Date("2026-01-10T00:00:00Z"),
        amount: new Decimal(5_000) as unknown as never,
        taxAmount: new Decimal(900) as unknown as never,
        totalAmount: new Decimal(5_900) as unknown as never,
      },
    ] as never);

    const buckets = await buildVatReport({
      tenantId: TENANT,
      range: { from: new Date("2026-01-01"), to: new Date("2026-01-31") },
    });

    expect(buckets).toHaveLength(1);
    expect(buckets[0]!.outputVat.toString()).toBe("1800");
    expect(buckets[0]!.inputVat.toString()).toBe("900");
    expect(buckets[0]!.netVat.toString()).toBe("900");
    expect(buckets[0]!.rate).toBe(18);
  });

  it("מחשב מע\"מ נטו מ-totalAmount אם taxAmount=0", async () => {
    prisma.invoice.findMany.mockResolvedValue([
      {
        issuedAt: new Date("2026-02-15T00:00:00Z"),
        totalAmount: new Decimal(1_180) as unknown as never,
        taxAmount: new Decimal(0) as unknown as never,
        vatRate: new Decimal(18) as unknown as never,
      },
    ] as never);
    prisma.supplierInvoice.findMany.mockResolvedValue([] as never);

    const buckets = await buildVatReport({
      tenantId: TENANT,
      range: { from: new Date("2026-02-01"), to: new Date("2026-02-28") },
    });
    // 1180 / 1.18 * 0.18 = 180
    expect(buckets[0]!.outputVat.toNumber()).toBeCloseTo(180, 2);
  });
});
