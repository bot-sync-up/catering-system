/**
 * Excel Builder — ExcelJS עם RTL מובנה (sheet.views[0].rightToLeft = true)
 *
 * תומך:
 *   - P&L worksheet
 *   - VAT worksheet
 *   - Aging worksheet
 *   - Cashflow worksheet
 *   - LTV worksheet
 */
import ExcelJS from "exceljs";
import type {
  PnLBucket,
  VatBucket,
  AgingReport,
  CashflowPoint,
  CustomerLtvRow,
  EventProfitability,
} from "../types.js";
import { toDecimal } from "../utils/decimal.js";

function rtlSheet(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(name, {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  return ws;
}

function headerRow(ws: ExcelJS.Worksheet, headers: string[]): void {
  ws.addRow(headers);
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E79" } };
  row.alignment = { vertical: "middle", horizontal: "right" };
  row.height = 22;
}

const FMT_ILS = '#,##0.00 "₪"';

export async function buildPnLExcel(args: {
  buckets: PnLBucket[];
  periodLabel: string;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Aneh-HaShoel BI";
  wb.created = new Date();

  const ws = rtlSheet(wb, `P&L ${args.periodLabel}`);
  ws.columns = [
    { key: "label", width: 14 },
    { key: "revenue", width: 16, style: { numFmt: FMT_ILS } },
    { key: "cogs", width: 16, style: { numFmt: FMT_ILS } },
    { key: "grossMargin", width: 16, style: { numFmt: FMT_ILS } },
    { key: "grossMarginPct", width: 10, style: { numFmt: "0.0%" } },
    { key: "opex", width: 16, style: { numFmt: FMT_ILS } },
    { key: "ebitda", width: 16, style: { numFmt: FMT_ILS } },
    { key: "ebitdaPct", width: 10, style: { numFmt: "0.0%" } },
  ];
  headerRow(ws, [
    "תקופה",
    "הכנסות",
    'עלות מכר',
    "רווח גולמי",
    "% רווח גולמי",
    "הוצאות תפעול",
    "EBITDA",
    "% EBITDA",
  ]);
  for (const b of args.buckets) {
    ws.addRow({
      label: b.label,
      revenue: toDecimal(b.revenue).toNumber(),
      cogs: toDecimal(b.cogs).toNumber(),
      grossMargin: toDecimal(b.grossMargin).toNumber(),
      grossMarginPct: b.grossMarginPct / 100,
      opex: toDecimal(b.opex).toNumber(),
      ebitda: toDecimal(b.ebitda).toNumber(),
      ebitdaPct: b.ebitdaMarginPct / 100,
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildVatExcel(args: {
  buckets: VatBucket[];
  rate: number;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = rtlSheet(wb, `מע"מ ${args.rate}%`);
  ws.columns = [
    { key: "label", width: 14 },
    { key: "output", width: 16, style: { numFmt: FMT_ILS } },
    { key: "input", width: 16, style: { numFmt: FMT_ILS } },
    { key: "net", width: 16, style: { numFmt: FMT_ILS } },
  ];
  headerRow(ws, ["תקופה", 'מע"מ עסקאות', 'מע"מ תשומות', 'מע"מ נטו']);
  for (const b of args.buckets) {
    ws.addRow({
      label: b.label,
      output: toDecimal(b.outputVat).toNumber(),
      input: toDecimal(b.inputVat).toNumber(),
      net: toDecimal(b.netVat).toNumber(),
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildAgingExcel(report: AgingReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const summary = rtlSheet(wb, "סיכום");
  summary.columns = [
    { key: "bucket", width: 12 },
    { key: "total", width: 16, style: { numFmt: FMT_ILS } },
    { key: "count", width: 12 },
  ];
  headerRow(summary, ["טווח ימים", "סכום", "מס' חשבוניות"]);
  for (const b of report.buckets) {
    summary.addRow({
      bucket: b.bucket,
      total: toDecimal(b.total).toNumber(),
      count: b.invoiceCount,
    });
  }

  const details = rtlSheet(wb, "פירוט");
  details.columns = [
    { key: "customer", width: 30 },
    { key: "total", width: 16, style: { numFmt: FMT_ILS } },
    { key: "oldest", width: 14 },
  ];
  headerRow(details, ["לקוח", "סכום", "ימים ותיק ביותר"]);
  for (const r of report.byCustomer) {
    details.addRow({
      customer: r.customerName,
      total: toDecimal(r.total).toNumber(),
      oldest: r.oldestDays,
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildCashflowExcel(points: CashflowPoint[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = rtlSheet(wb, "תזרים מזומנים");
  ws.columns = [
    { key: "label", width: 12 },
    { key: "kind", width: 10 },
    { key: "inflow", width: 16, style: { numFmt: FMT_ILS } },
    { key: "outflow", width: 16, style: { numFmt: FMT_ILS } },
    { key: "net", width: 16, style: { numFmt: FMT_ILS } },
    { key: "confidence", width: 10, style: { numFmt: "0.0%" } },
  ];
  headerRow(ws, ["תקופה", "סוג", "הכנסות", "הוצאות", "נטו", "ביטחון"]);
  for (const p of points) {
    ws.addRow({
      label: p.label,
      kind: p.kind === "actual" ? "בפועל" : "חיזוי",
      inflow: toDecimal(p.inflow).toNumber(),
      outflow: toDecimal(p.outflow).toNumber(),
      net: toDecimal(p.net).toNumber(),
      confidence: p.confidence ?? 1,
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildLtvExcel(rows: CustomerLtvRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = rtlSheet(wb, "LTV לקוחות");
  ws.columns = [
    { key: "name", width: 30 },
    { key: "events", width: 10 },
    { key: "revenue", width: 16, style: { numFmt: FMT_ILS } },
    { key: "avg", width: 16, style: { numFmt: FMT_ILS } },
    { key: "ltv", width: 16, style: { numFmt: FMT_ILS } },
    { key: "lifespan", width: 12 },
  ];
  headerRow(ws, ["לקוח", "מס' אירועים", "סך הכנסות", "ממוצע אירוע", "LTV חזוי", "ימים פעיל"]);
  for (const r of rows) {
    ws.addRow({
      name: r.customerName,
      events: r.totalEvents,
      revenue: toDecimal(r.totalRevenue).toNumber(),
      avg: toDecimal(r.avgEventValue).toNumber(),
      ltv: toDecimal(r.predictedLtv).toNumber(),
      lifespan: r.lifespanDays,
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildEventProfitabilityExcel(
  rows: EventProfitability[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = rtlSheet(wb, "רווחיות לפי אירוע");
  ws.columns = [
    { key: "title", width: 30 },
    { key: "date", width: 14 },
    { key: "guests", width: 10 },
    { key: "revenue", width: 16, style: { numFmt: FMT_ILS } },
    { key: "ingredients", width: 16, style: { numFmt: FMT_ILS } },
    { key: "labor", width: 16, style: { numFmt: FMT_ILS } },
    { key: "overhead", width: 16, style: { numFmt: FMT_ILS } },
    { key: "profit", width: 16, style: { numFmt: FMT_ILS } },
    { key: "margin", width: 10, style: { numFmt: "0.0%" } },
  ];
  headerRow(ws, [
    "אירוע",
    "תאריך",
    "אורחים",
    "הכנסה",
    "חומרי גלם",
    "עבודה",
    "עקיף",
    "רווח",
    "% רווח",
  ]);
  for (const r of rows) {
    ws.addRow({
      title: r.eventTitle,
      date: r.startsAt,
      guests: r.guestCount,
      revenue: toDecimal(r.revenue).toNumber(),
      ingredients: toDecimal(r.ingredientsCost).toNumber(),
      labor: toDecimal(r.laborCost).toNumber(),
      overhead: toDecimal(r.overheadCost).toNumber(),
      profit: toDecimal(r.grossProfit).toNumber(),
      margin: r.marginPct / 100,
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
