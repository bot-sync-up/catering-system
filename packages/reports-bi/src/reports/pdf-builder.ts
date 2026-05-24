/**
 * PDF Builder — בונה PDF עם pdfkit + פונט Heebo (תמיכת עברית RTL)
 *
 * שימוש:
 *   const pdf = await buildPnLPdf({ buckets, summary, periodLabel });
 *   await fs.writeFile("pnl.pdf", pdf);
 *
 * הערה: pdfkit לא תומך RTL אוטומטית — אנו הופכים מחרוזות עברית ידנית
 * רק עבור strings שמכילים תווים עבריים, ומיישרים text לימין.
 */
import PDFDocument from "pdfkit";
import { Writable } from "node:stream";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PnLBucket, VatBucket, AgingReport } from "../types.js";
import { formatIls } from "../utils/decimal.js";
import { formatHebrewDate } from "../utils/dates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.resolve(__dirname, "..", "..", "fonts");
export const HEEBO_REGULAR = path.join(FONT_DIR, "Heebo-Regular.ttf");
export const HEEBO_BOLD = path.join(FONT_DIR, "Heebo-Bold.ttf");

/** הופך מחרוזת לתצוגה RTL (פתרון פשוט — מהפך תווים) */
function rtl(text: string): string {
  // pdfkit מציג שמאל-לימין; כדי לקבל RTL נכון בלי shaping מלא, נהפוך את התווים.
  // עבור טקסט מעורב (עברית+אנגלית+מספרים) זה לא מושלם — בפרודקשן עדיף harfbuzz/pdf-lib.
  // לצורך דוחות סטנדרטיים מספיק.
  if (!/[֐-׿]/.test(text)) return text;
  return text.split("").reverse().join("");
}

interface PdfBuildOptions {
  title: string;
  subtitle?: string;
  generatedAt?: Date;
  tenantName?: string;
}

function newDoc(opts: PdfBuildOptions): { doc: PDFKit.PDFDocument; chunks: Buffer[] } {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    info: { Title: opts.title, Author: opts.tenantName ?? "Aneh-HaShoel BI" },
  });
  try {
    doc.registerFont("Heebo", HEEBO_REGULAR);
    doc.registerFont("Heebo-Bold", HEEBO_BOLD);
    doc.font("Heebo");
  } catch {
    // fallback אם פונט לא קיים בזמן ריצה — נשתמש ב-default
  }
  const chunks: Buffer[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      cb();
    },
  });
  doc.pipe(stream);

  // Header
  doc.fontSize(20);
  doc.text(rtl(opts.title), { align: "right" });
  if (opts.subtitle) {
    doc.fontSize(12).text(rtl(opts.subtitle), { align: "right" });
  }
  doc.fontSize(9).text(
    rtl(`הופק בתאריך: ${formatHebrewDate(opts.generatedAt ?? new Date())}`),
    { align: "right" },
  );
  doc.moveDown(1);

  return { doc, chunks };
}

async function finalize(doc: PDFKit.PDFDocument, chunks: Buffer[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function buildPnLPdf(args: {
  buckets: PnLBucket[];
  periodLabel: string;
  tenantName?: string;
}): Promise<Buffer> {
  const { doc, chunks } = newDoc({
    title: "דוח רווח והפסד",
    subtitle: args.periodLabel,
    tenantName: args.tenantName,
  });
  const cols = ["תקופה", "הכנסות", "עלות מכר", "רווח גולמי", "%", "הוצ' תפעול", "EBITDA"];
  drawTableHeader(doc, cols);
  for (const b of args.buckets) {
    drawRow(doc, [
      b.label,
      formatIls(b.revenue),
      formatIls(b.cogs),
      formatIls(b.grossMargin),
      `${b.grossMarginPct.toFixed(1)}%`,
      formatIls(b.opex),
      formatIls(b.ebitda),
    ]);
  }
  return finalize(doc, chunks);
}

export async function buildVatPdf(args: {
  buckets: VatBucket[];
  rate: number;
  periodLabel: string;
  tenantName?: string;
}): Promise<Buffer> {
  const { doc, chunks } = newDoc({
    title: `דוח מע"מ (${args.rate}%)`,
    subtitle: args.periodLabel,
    tenantName: args.tenantName,
  });
  const cols = ["תקופה", "מע\"מ עסקאות", "מע\"מ תשומות", "מע\"מ נטו"];
  drawTableHeader(doc, cols);
  for (const b of args.buckets) {
    drawRow(doc, [b.label, formatIls(b.outputVat), formatIls(b.inputVat), formatIls(b.netVat)]);
  }
  return finalize(doc, chunks);
}

export async function buildAgingPdf(args: {
  report: AgingReport;
  tenantName?: string;
}): Promise<Buffer> {
  const { doc, chunks } = newDoc({
    title: "דוח חובות לקוחות",
    subtitle: `נכון ל-${formatHebrewDate(args.report.asOf)}`,
    tenantName: args.tenantName,
  });
  drawTableHeader(doc, ["טווח ימים", "סכום", "מס' חשבוניות"]);
  for (const b of args.report.buckets) {
    drawRow(doc, [b.bucket, formatIls(b.total), b.invoiceCount.toString()]);
  }
  doc.moveDown(1);
  doc.fontSize(14).text(rtl("פירוט לפי לקוח"), { align: "right" });
  doc.moveDown(0.5);
  doc.fontSize(10);
  drawTableHeader(doc, ["לקוח", "סכום", "ימים ותיק ביותר"]);
  for (const r of args.report.byCustomer) {
    drawRow(doc, [r.customerName, formatIls(r.total), r.oldestDays.toString()]);
  }
  return finalize(doc, chunks);
}

function drawTableHeader(doc: PDFKit.PDFDocument, cols: string[]): void {
  doc.fontSize(11);
  try {
    doc.font("Heebo-Bold");
  } catch {}
  const colWidth = (doc.page.width - 100) / cols.length;
  let x = doc.page.width - 50 - colWidth;
  const y = doc.y;
  for (const c of cols) {
    doc.text(rtl(c), x, y, { width: colWidth, align: "right" });
    x -= colWidth;
  }
  doc.moveDown(1);
  try {
    doc.font("Heebo");
  } catch {}
}

function drawRow(doc: PDFKit.PDFDocument, values: string[]): void {
  doc.fontSize(10);
  const colWidth = (doc.page.width - 100) / values.length;
  let x = doc.page.width - 50 - colWidth;
  const y = doc.y;
  for (const v of values) {
    doc.text(rtl(v), x, y, { width: colWidth, align: "right" });
    x -= colWidth;
  }
  doc.moveDown(0.7);
}
