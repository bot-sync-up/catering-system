/**
 * בדיקת ניתוב — שהפונקציה routeTransform מנתבת נכון לפי (sourceModule, sourceTable).
 */
import { describe, it, expect } from "vitest";
import { routeTransform } from "../src/transformers/index.js";
import type { ExtractedRecord } from "../src/types.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

function mkRec(
  sourceModule: string,
  sourceTable: string,
  payload: Record<string, unknown>,
): ExtractedRecord {
  return {
    payload,
    __meta: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sourceModule: sourceModule as any,
      sourceTable,
      originalId: (payload.id as string) ?? "unknown",
      extractedAt: new Date(),
      batchId: "test",
    },
  };
}

describe("routeTransform", () => {
  it("CRM Customer → Customer", () => {
    const out = routeTransform(
      mkRec("crm", "Customer", {
        id: "c1",
        type: "BUSINESS",
        status: "ACTIVE",
        displayName: "X",
        churnScore: 0,
        upsellScore: 0,
        ltv: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      "Customer",
      TENANT,
    );
    expect(out.targetModel).toBe("Customer");
  });

  it("Orders → Event", () => {
    const out = routeTransform(
      mkRec("orders", "Order", {
        id: "o1",
        orderNumber: "ORD-1",
        type: "WEDDING",
        status: "CONFIRMED",
        channel: "WEB",
        customerId: "x",
        eventDate: new Date(),
        subtotal: 100,
        taxAmount: 18,
        totalAmount: 118,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      "Order",
      TENANT,
    );
    expect(out.targetModel).toBe("Event");
  });

  it("HR Employee → Employee", () => {
    const out = routeTransform(
      mkRec("hr", "Employee", {
        id: "e1",
        employeeNum: "E-001",
        firstName: "x",
        lastName: "y",
        hireDate: new Date(),
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      "Employee",
      TENANT,
    );
    expect(out.targetModel).toBe("Employee");
  });

  it("מקור לא מוכר זורק שגיאה", () => {
    expect(() =>
      routeTransform(mkRec("crm", "UnknownTable", { id: "z" }), "UnknownTable", TENANT),
    ).toThrow(/אין transformer/);
  });
});
