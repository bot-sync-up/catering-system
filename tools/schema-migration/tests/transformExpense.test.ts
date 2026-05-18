import { describe, it, expect } from "vitest";
import { transformExpense } from "../src/transformers/transformExpense.js";
import type { ExpensesExpenseRow } from "../src/extractors/extractExpensesFromExpenses.js";
import type { ExtractedRecord } from "../src/types.js";

const TENANT = "00000000-0000-0000-0000-000000000001";

function mkRec(partial: Partial<ExpensesExpenseRow> = {}): ExtractedRecord<ExpensesExpenseRow> {
  const payload: ExpensesExpenseRow = {
    id: "exp_1",
    amount: "1234.56",
    currency: "ILS",
    vatAmount: "210.00",
    description: "קניית ירקות",
    expenseDate: new Date("2025-04-15"),
    invoiceNumber: "S-200",
    invoiceUrl: null,
    ocrData: null,
    source: "OCR",
    status: "APPROVED",
    coaId: "coa_1",
    vendorId: "vendor_1",
    userId: "user_1",
    recurringId: null,
    bankTransactionId: null,
    createdAt: new Date("2025-04-15"),
    updatedAt: new Date("2025-04-16"),
    ...partial,
  };
  return {
    payload,
    __meta: {
      sourceModule: "expenses",
      sourceTable: "Expense",
      originalId: payload.id,
      extractedAt: new Date(),
      batchId: "test_batch",
    },
  };
}

describe("transformExpense", () => {
  it("ממיר Decimal(14,2) ושומר דיוק", () => {
    const out = transformExpense(mkRec(), TENANT);
    expect(out.data.amount.toString()).toBe("1234.56");
    expect(out.data.vatAmount?.toString()).toBe("210");
  });

  it("category ברירת מחדל = OFFICIAL", () => {
    const out = transformExpense(mkRec(), TENANT);
    expect(out.data.category).toBe("OFFICIAL");
  });

  it("ממפה source/status", () => {
    expect(transformExpense(mkRec({ source: "OCR" }), TENANT).data.source).toBe("OCR");
    expect(transformExpense(mkRec({ status: "PENDING" }), TENANT).data.status).toBe("RECORDED");
  });

  it("vendorId הופך ל־supplierId דטרמיניסטי", () => {
    const out = transformExpense(mkRec(), TENANT);
    expect(out.data.supplierId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("מזהיר על source לא ידוע", () => {
    const out = transformExpense(mkRec({ source: "TELEPATHY" }), TENANT);
    expect(out.warnings.some((w) => w.includes("ExpenseSource"))).toBe(true);
  });

  it("description ריק מקבל ברירת מחדל", () => {
    const out = transformExpense(mkRec({ description: "" }), TENANT);
    expect(out.data.description).toBe("(ללא תיאור)");
  });
});
