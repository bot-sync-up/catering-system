import { describe, it, expect } from "vitest";
import { InvoiceSubmitter } from "../src/rpa/InvoiceSubmitter.js";
import { BankReconciler } from "../src/rpa/BankReconciler.js";
import { TaxFiler } from "../src/rpa/TaxFiler.js";

describe("InvoiceSubmitter", () => {
  it("dry-run מחזיר success עם חישוב סכום נכון", async () => {
    const s = new InvoiceSubmitter({ dryRun: true });
    const r = await s.submit({
      customer: { name: "לקוח בדיקה" },
      lines: [
        { description: "מנה ראשונה", quantity: 10, unitPriceIls: 100, vatPercent: 18 },
      ],
      internalRef: "INT-1",
      issueDate: "2026-05-24",
    });
    expect(r.success).toBe(true);
    expect(r.dryRun).toBe(true);
    expect(r.totalIls).toBe(1180);
  });
});

describe("BankReconciler", () => {
  it("מתאים exact ו-fuzzy", () => {
    const rec = new BankReconciler();
    const result = rec.reconcile(
      [
        { id: "T1", date: "2026-05-20", amountIls: 1180.0 },
        { id: "T2", date: "2026-05-22", amountIls: 999.95 }, // fuzzy
        { id: "T3", date: "2026-05-21", amountIls: 50 },
      ],
      [
        { invoiceNumber: "I1", issueDate: "2026-05-19", totalIls: 1180, customer: "א" },
        { invoiceNumber: "I2", issueDate: "2026-05-20", totalIls: 1000, customer: "ב" },
      ],
    );
    expect(result.matches).toHaveLength(2);
    expect(result.matches.find((m) => m.invoiceNumber === "I1")?.matchType).toBe("exact");
    expect(result.matches.find((m) => m.invoiceNumber === "I2")?.matchType).toBe("fuzzy");
    expect(result.unmatchedTransactions.map((t) => t.id)).toEqual(["T3"]);
  });
});

describe("TaxFiler", () => {
  it("בונה טופס 102 עם header, רשומות ו-footer", () => {
    const f = new TaxFiler();
    const txt = f.buildForm102({
      reportingTaxId: "514123456",
      period: "202605",
      rows: [
        { withheldId: "300123456", kind: "salary", grossAmountIls: 10000, withheldAmountIls: 1500 },
        { withheldId: "300999888", kind: "supplier", grossAmountIls: 2000, withheldAmountIls: 100 },
      ],
    });
    const lines = txt.trim().split("\n");
    expect(lines[0].startsWith("H")).toBe(true);
    expect(lines.length).toBe(4); // header + 2 + footer
    expect(lines[lines.length - 1].startsWith("T")).toBe(true);
  });

  it("בונה טופס 126", () => {
    const f = new TaxFiler();
    const txt = f.buildForm126({
      reportingTaxId: "514123456",
      year: "2025",
      rows: [
        {
          employeeId: "300111222",
          fullName: "ישראל ישראלי",
          grossAnnualIls: 120000,
          incomeTaxIls: 12000,
          nationalInsuranceIls: 8000,
          healthIls: 4000,
        },
      ],
    });
    const lines = txt.trim().split("\n");
    expect(lines[0].startsWith("H126")).toBe(true);
    expect(lines[lines.length - 1].startsWith("T126")).toBe(true);
  });
});
