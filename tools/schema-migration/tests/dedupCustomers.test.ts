import { describe, it, expect } from "vitest";
import { Decimal } from "decimal.js";
import { dedupCustomers } from "../src/dedup/dedupCustomers.js";
import type { NewCustomerData } from "../src/transformers/transformCustomer.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

function mk(id: string, overrides: Partial<NewCustomerData> = {}): NewCustomerData {
  return {
    id,
    tenantId: TENANT,
    type: "INDIVIDUAL",
    status: "ACTIVE",
    displayName: "ישראל ישראלי",
    companyName: null,
    taxId: null,
    email: null,
    phone: null,
    website: null,
    notes: null,
    churnScore: new Decimal(0),
    upsellScore: new Decimal(0),
    ltv: new Decimal(0),
    lastContactAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
    _migrationSource: "src",
    _migrationBatchId: "b",
    ...overrides,
  };
}

describe("dedupCustomers", () => {
  it("מזהה כפילויות לפי taxId", () => {
    const groups = dedupCustomers([
      mk("a", { taxId: "514123456" }),
      mk("b", { taxId: "514123456" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.confidence).toBe("high");
    expect(groups[0]?.duplicateIds).toContain("b");
  });

  it("מזהה כפילויות לפי email", () => {
    const groups = dedupCustomers([
      mk("a", { email: "x@y.com" }),
      mk("b", { email: "x@y.com" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.reason).toContain("email");
  });

  it("מזהה כפילויות לפי phone", () => {
    const groups = dedupCustomers([
      mk("a", { phone: "+972501111111" }),
      mk("b", { phone: "+972501111111" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.reason).toContain("phone");
  });

  it("fuzzy name match באותו tenant", () => {
    const groups = dedupCustomers([
      mk("a", { displayName: "אולמי תפארת" }),
      mk("b", { displayName: "אולמי תפארת " }),
    ]);
    expect(groups.length).toBeGreaterThanOrEqual(1);
    expect(groups[0]?.confidence).toBe("medium");
  });

  it("לא תופס שמות שונים", () => {
    const groups = dedupCustomers([
      mk("a", { displayName: "אולמי תפארת" }),
      mk("b", { displayName: "מסעדת הים" }),
    ]);
    expect(groups).toHaveLength(0);
  });

  it("canonical הוא הרשומה עם הכי הרבה נתונים", () => {
    const groups = dedupCustomers([
      mk("partial", { email: "x@y.com" }),
      mk("full", { email: "x@y.com", taxId: "111", phone: "+972500000000", companyName: "x" }),
    ]);
    expect(groups[0]?.canonicalId).toBe("full");
  });

  it("שני tenants שונים לא ממוזגים על fuzzy name", () => {
    const groups = dedupCustomers([
      mk("a", { tenantId: TENANT, displayName: "אולמי תפארת" }),
      mk("b", { tenantId: "00000000-0000-0000-0000-000000000002", displayName: "אולמי תפארת" }),
    ]);
    expect(groups).toHaveLength(0);
  });
});
