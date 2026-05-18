import { describe, it, expect } from "vitest";
import { transformOrder } from "../src/transformers/transformOrder.js";
import type { OrdersOrderRow } from "../src/extractors/extractOrdersFromOrdersModule.js";
import type { ExtractedRecord } from "../src/types.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

function mkRec(partial: Partial<OrdersOrderRow> = {}): ExtractedRecord<OrdersOrderRow> {
  const payload: OrdersOrderRow = {
    id: "ord_cuid",
    orderNumber: "ORD-2025-100",
    type: "WEDDING",
    status: "CONFIRMED",
    channel: "WEBSITE",
    customerId: "cust_x",
    eventDate: new Date("2025-09-01"),
    eventLocation: "אולמי תפארת, בני ברק",
    guestCount: 350,
    subscriptionId: null,
    subtotal: 75000,
    taxAmount: 12750,
    totalAmount: 87750,
    customerNotes: null,
    internalNotes: null,
    approvedById: null,
    approvedAt: null,
    rejectedReason: null,
    createdAt: new Date("2025-05-01"),
    updatedAt: new Date("2025-05-15"),
    ...partial,
  };
  return {
    payload,
    __meta: {
      sourceModule: "orders",
      sourceTable: "Order",
      originalId: payload.id,
      extractedAt: new Date(),
      batchId: "test_batch",
    },
  };
}

describe("transformOrder", () => {
  it("מייצר Event עם guestCount", () => {
    const out = transformOrder(mkRec(), TENANT);
    expect(out.targetModel).toBe("Event");
    expect(out.data.guestCount).toBe(350);
    expect(out.data.eventLocation).toBe("אולמי תפארת, בני ברק");
  });

  it("ממפה type ל־EventType", () => {
    expect(transformOrder(mkRec({ type: "WEDDING" }), TENANT).data.type).toBe("WEDDING");
    expect(transformOrder(mkRec({ type: "BAR_MITZVAH" }), TENANT).data.type).toBe("BAR_MITZVAH");
    expect(transformOrder(mkRec({ type: "BRIT" }), TENANT).data.type).toBe("BRIT_MILAH");
  });

  it("OrderType לא ידוע → OTHER + warning", () => {
    const out = transformOrder(mkRec({ type: "ROCKETRY" }), TENANT);
    expect(out.data.type).toBe("OTHER");
    expect(out.warnings.length).toBeGreaterThan(0);
  });

  it("ממיר Float ל־Decimal(12,2)", () => {
    const out = transformOrder(mkRec(), TENANT);
    expect(out.data.basePrice.toString()).toBe("75000");
    expect(out.data.totalPrice.toString()).toBe("87750");
  });

  it("מזהיר אם eventDate חסר", () => {
    const out = transformOrder(mkRec({ eventDate: null }), TENANT);
    expect(out.warnings.some((w) => w.includes("eventDate"))).toBe(true);
    expect(out.data.eventDate).toBeInstanceOf(Date);
  });

  it("upsertKey = (tenantId, eventNumber)", () => {
    const out = transformOrder(mkRec(), TENANT);
    expect(out.upsertKey).toEqual({ tenantId: TENANT, eventNumber: "ORD-2025-100" });
  });
});
