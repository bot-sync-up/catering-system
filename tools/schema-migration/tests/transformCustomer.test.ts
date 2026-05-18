import { describe, it, expect } from "vitest";
import { transformCustomer } from "../src/transformers/transformCustomer.js";
import type { CrmCustomerRow } from "../src/extractors/extractCustomersFromCrm.js";
import type { ExtractedRecord } from "../src/types.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

function mkRec(partial: Partial<CrmCustomerRow> = {}): ExtractedRecord<CrmCustomerRow> {
  const payload: CrmCustomerRow = {
    id: "cuid_abc",
    type: "BUSINESS",
    status: "ACTIVE",
    displayName: "אולמי תפארת",
    companyName: "תפארת בע\"מ",
    taxId: "514123456",
    email: "info@tiferet.co.il",
    phone: "03-1234567",
    website: null,
    notes: null,
    churnScore: 0.2,
    upsellScore: 0.5,
    ltv: 120000,
    lastContact: new Date("2025-12-01"),
    accountManagerId: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...partial,
  };
  return {
    payload,
    __meta: {
      sourceModule: "crm",
      sourceTable: "Customer",
      originalId: payload.id,
      extractedAt: new Date(),
      batchId: "test_batch",
    },
  };
}

describe("transformCustomer", () => {
  it("ממפה שדות בסיסיים נכון", () => {
    const out = transformCustomer(mkRec(), TENANT);
    expect(out.targetModel).toBe("Customer");
    expect(out.data.tenantId).toBe(TENANT);
    expect(out.data.displayName).toBe("אולמי תפארת");
    expect(out.data.email).toBe("info@tiferet.co.il");
    expect(out.data.phone).toBe("+97231234567");
    expect(out.data.type).toBe("BUSINESS");
    expect(out.data.status).toBe("ACTIVE");
  });

  it("ממיר Float ל־Decimal עבור ltv ו־scores", () => {
    const out = transformCustomer(mkRec(), TENANT);
    expect(out.data.ltv.toString()).toBe("120000");
    expect(out.data.churnScore.toString()).toBe("0.2");
    expect(out.data.upsellScore.toString()).toBe("0.5");
  });

  it("clamps churnScore ל־[0,1]", () => {
    const out = transformCustomer(mkRec({ churnScore: 1.5, upsellScore: -0.1 }), TENANT);
    expect(out.data.churnScore.toString()).toBe("1");
    expect(out.data.upsellScore.toString()).toBe("0");
  });

  it("מזהיר על type/status לא ידועים", () => {
    const out = transformCustomer(mkRec({ type: "UNKNOWN_TYPE", status: "WEIRD" }), TENANT);
    expect(out.warnings.some((w) => w.includes("type"))).toBe(true);
    expect(out.warnings.some((w) => w.includes("status"))).toBe(true);
    expect(out.data.type).toBe("INDIVIDUAL");
    expect(out.data.status).toBe("ACTIVE");
  });

  it("upsertKey משתמש ב־taxId אם יש", () => {
    const out = transformCustomer(mkRec(), TENANT);
    expect(out.upsertKey).toEqual({ tenantId: TENANT, taxId: "514123456" });
  });

  it("upsertKey נופל ל־email אם אין taxId", () => {
    const out = transformCustomer(mkRec({ taxId: null }), TENANT);
    expect(out.upsertKey).toEqual({ tenantId: TENANT, email: "info@tiferet.co.il" });
  });

  it("displayName ריק מקבל ברירת מחדל", () => {
    const out = transformCustomer(mkRec({ displayName: "  " }), TENANT);
    expect(out.data.displayName).toBe("(ללא שם)");
  });

  it("מזהה דטרמיניסטי — אותו מקור = אותו id", () => {
    const a = transformCustomer(mkRec(), TENANT);
    const b = transformCustomer(mkRec(), TENANT);
    expect(a.data.id).toBe(b.data.id);
  });
});
