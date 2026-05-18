/**
 * Snapshot-style tests עבור PDF/Excel builders.
 *
 * אנו בודקים מטא-נתונים בלבד (גודל buffer, header magic bytes, מספר sheets)
 * — לא תוכן מלא, כי PDF/XLSX הם בינאריים שלא ניתן להשוות שורה-שורה ב-snapshot.
 */
import { describe, it, expect } from "vitest";
import { Decimal } from "decimal.js";
import ExcelJS from "exceljs";
import { buildPnLExcel, buildVatExcel, buildAgingExcel } from "../src/reports/excel-builder.js";
import type { PnLBucket, VatBucket, AgingReport } from "../src/types.js";

const samplePnl: PnLBucket[] = [
  {
    periodStart: new Date("2026-01-01T00:00:00Z"),
    label: "2026-01",
    revenue: new Decimal(100_000),
    cogs: new Decimal(40_000),
    grossMargin: new Decimal(60_000),
    grossMarginPct: 60,
    opex: new Decimal(20_000),
    ebitda: new Decimal(40_000),
    ebitdaMarginPct: 40,
  },
];

const sampleVat: VatBucket[] = [
  {
    periodStart: new Date("2026-01-01T00:00:00Z"),
    label: "2026-01",
    outputVat: new Decimal(18_000),
    inputVat: new Decimal(5_000),
    netVat: new Decimal(13_000),
    rate: 18,
  },
];

const sampleAging: AgingReport = {
  asOf: new Date("2026-05-17T00:00:00Z"),
  buckets: [
    { bucket: "0-30", total: new Decimal(50_000), invoiceCount: 5 },
    { bucket: "31-60", total: new Decimal(20_000), invoiceCount: 2 },
    { bucket: "61-90", total: new Decimal(10_000), invoiceCount: 1 },
    { bucket: "90+", total: new Decimal(5_000), invoiceCount: 1 },
  ],
  byCustomer: [
    { customerId: "c1", customerName: "לקוח ראשון", total: new Decimal(50_000), oldestDays: 15 },
  ],
};

describe("Excel builders", () => {
  it("P&L: יוצר workbook עם sheet RTL וכותרות נכונות", async () => {
    const buf = await buildPnLExcel({ buckets: samplePnl, periodLabel: "2026" });
    expect(buf.length).toBeGreaterThan(2_000);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0]!;
    expect(ws.views?.[0]?.rightToLeft).toBe(true);

    const headerRow = ws.getRow(1);
    expect(headerRow.getCell(1).value).toBe("תקופה");
    expect(headerRow.getCell(2).value).toBe("הכנסות");
  });

  it("VAT: מציג רייט במספר הsheet", async () => {
    const buf = await buildVatExcel({ buckets: sampleVat, rate: 18 });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    expect(wb.worksheets[0]!.name).toContain("18");
  });

  it("Aging: שני sheets — סיכום ופירוט", async () => {
    const buf = await buildAgingExcel(sampleAging);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    expect(wb.worksheets).toHaveLength(2);
    expect(wb.worksheets[0]!.name).toBe("סיכום");
    expect(wb.worksheets[1]!.name).toBe("פירוט");
  });
});
