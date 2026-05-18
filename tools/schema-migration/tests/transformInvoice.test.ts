import { describe, it, expect } from "vitest";
import { transformInvoice } from "../src/transformers/transformInvoice.js";
import type { FinanceDocsInvoiceRow } from "../src/extractors/extractInvoicesFromFinanceDocs.js";
import type { ExtractedRecord } from "../src/types.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

function mkRec(partial: Partial<FinanceDocsInvoiceRow> = {}): ExtractedRecord<FinanceDocsInvoiceRow> {
  const payload: FinanceDocsInvoiceRow = {
    id: "inv_cuid",
    orgId: "org_1",
    customerId: "cust_cuid",
    type: "INVOICE",
    tag: "OFFICIAL",
    status: "ISSUED",
    number: "INV-2025-001",
    issueDate: new Date("2025-06-01"),
    dueDate: new Date("2025-07-01"),
    currency: "ILS",
    subtotal: "1000.00",
    vatRate: "0.17",
    vatAmount: "170.00",
    total: "1170.00",
    paidAmount: "500.00",
    balance: "670.00",
    notes: null,
    pdfPath: null,
    parentId: null,
    createdAt: new Date("2025-06-01"),
    updatedAt: new Date("2025-06-15"),
    ...partial,
  };
  return {
    payload,
    __meta: {
      sourceModule: "finance-docs",
      sourceTable: "Document",
      originalId: payload.id,
      extractedAt: new Date(),
      batchId: "test_batch",
    },
  };
}

describe("transformInvoice", () => {
  it("ממיר vatRate מ־0.17 ל־17", () => {
    const out = transformInvoice(mkRec(), TENANT);
    expect(out.data.vatRate.toString()).toBe("17");
  });

  it("שומר vatRate=18 בלי שינוי", () => {
    const out = transformInvoice(mkRec({ vatRate: "0.18" }), TENANT);
    expect(out.data.vatRate.toString()).toBe("18");
  });

  it("ממפה OFFICIAL/UNOFFICIAL", () => {
    expect(transformInvoice(mkRec({ tag: "OFFICIAL" }), TENANT).data.category).toBe("OFFICIAL");
    expect(transformInvoice(mkRec({ tag: "UNOFFICIAL" }), TENANT).data.category).toBe("UNOFFICIAL");
  });

  it("מזהיר על אינווריאנט סכומים שבור", () => {
    const out = transformInvoice(
      mkRec({ subtotal: "1000", vatAmount: "170", total: "9999" }),
      TENANT,
    );
    expect(out.warnings.some((w) => w.includes("סכום לא תואם"))).toBe(true);
  });

  it("upsertKey = (tenantId, invoiceNum)", () => {
    const out = transformInvoice(mkRec(), TENANT);
    expect(out.upsertKey).toEqual({ tenantId: TENANT, invoiceNum: "INV-2025-001" });
  });

  it("מזהיר על status לא ידוע", () => {
    const out = transformInvoice(mkRec({ status: "FOOBAR" }), TENANT);
    expect(out.warnings.some((w) => w.includes("InvoiceStatus"))).toBe(true);
    expect(out.data.status).toBe("DRAFT");
  });

  it("ממיר Decimal(14,2) ל־Decimal(12,2) ושומר ערך", () => {
    const out = transformInvoice(mkRec({ subtotal: "1234567.89" }), TENANT);
    expect(out.data.amount.toString()).toBe("1234567.89");
  });
});
