import { describe, it, expect } from "vitest";
import { transformPayment } from "../src/transformers/transformPayment.js";
import type { FinancePaymentRow } from "../src/extractors/extractPaymentsFromFinanceDocs.js";
import type { ExtractedRecord } from "../src/types.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

function mkRec(partial: Partial<FinancePaymentRow> = {}): ExtractedRecord<FinancePaymentRow> {
  const payload: FinancePaymentRow = {
    id: "pay_1",
    documentId: "inv_cuid",
    amount: "500.00",
    method: "BIT",
    paidAt: new Date("2025-06-10"),
    reference: "REF-123",
    notes: null,
    createdAt: new Date("2025-06-10"),
    ...partial,
  };
  return {
    payload,
    __meta: {
      sourceModule: "finance-docs",
      sourceTable: "Payment",
      originalId: payload.id,
      extractedAt: new Date(),
      batchId: "test_batch",
    },
  };
}

describe("transformPayment", () => {
  it("ממפה method מ־enum הישן ל־החדש", () => {
    expect(transformPayment(mkRec({ method: "CASH" }), TENANT).data.method).toBe("CASH");
    expect(transformPayment(mkRec({ method: "WIRE" }), TENANT).data.method).toBe("BANK_TRANSFER");
    expect(transformPayment(mkRec({ method: "CC" }), TENANT).data.method).toBe("CREDIT_CARD");
    expect(transformPayment(mkRec({ method: "BIT" }), TENANT).data.method).toBe("BIT");
    expect(transformPayment(mkRec({ method: "PAYBOX" }), TENANT).data.method).toBe("PAYBOX");
  });

  it("מקשר ל־invoiceId דטרמיניסטי", () => {
    const out = transformPayment(mkRec(), TENANT);
    expect(out.data.invoiceId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("ממיר amount ל־Decimal", () => {
    const out = transformPayment(mkRec({ amount: "1234.56" }), TENANT);
    expect(out.data.amount.toString()).toBe("1234.56");
  });

  it("category ברירת מחדל OFFICIAL", () => {
    const out = transformPayment(mkRec(), TENANT);
    expect(out.data.category).toBe("OFFICIAL");
  });

  it("מזהיר על method לא ידוע", () => {
    const out = transformPayment(mkRec({ method: "CRYPTO" }), TENANT);
    expect(out.warnings.some((w) => w.includes("PaymentMethod"))).toBe(true);
    expect(out.data.method).toBe("OTHER");
  });
});
