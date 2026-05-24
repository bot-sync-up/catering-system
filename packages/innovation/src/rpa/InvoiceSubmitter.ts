/**
 * InvoiceSubmitter — אוטומציה לשליחת חשבוניות ל-iCount.
 *
 * המודול מצפה ל-credentials של iCount API (קומבינציית CID + Token).
 * כשרצים בלי credentials — פועל במצב dry-run ומדפיס מה היה נשלח.
 */

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPriceIls: number;
  vatPercent: number; // 18 בישראל מאוגוסט 2025
}

export interface InvoicePayload {
  customer: {
    name: string;
    taxId?: string;
    email?: string;
    phone?: string;
  };
  lines: InvoiceLine[];
  /** מספר הזמנה פנימי — מצויין כהפניה. */
  internalRef: string;
  issueDate: string; // YYYY-MM-DD
}

export interface InvoiceSubmitterOptions {
  /** Company ID ב-iCount. */
  cid?: string;
  token?: string;
  /** עוקף את הקריאה בפועל ל-API — לבדיקות. */
  dryRun?: boolean;
  /** fetch לזריקה (לבדיקות). */
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

export interface SubmissionResult {
  success: boolean;
  invoiceNumber?: string;
  totalIls?: number;
  raw?: unknown;
  dryRun: boolean;
  reasonHe?: string;
}

export class InvoiceSubmitter {
  private opts: InvoiceSubmitterOptions;

  constructor(opts: InvoiceSubmitterOptions = {}) {
    this.opts = opts;
  }

  async submit(payload: InvoicePayload): Promise<SubmissionResult> {
    const total = payload.lines.reduce(
      (sum, l) => sum + l.unitPriceIls * l.quantity * (1 + l.vatPercent / 100),
      0,
    );
    const totalRounded = Math.round(total * 100) / 100;

    if (this.opts.dryRun || !this.opts.cid || !this.opts.token) {
      return {
        success: true,
        invoiceNumber: `DRY-${payload.internalRef}`,
        totalIls: totalRounded,
        dryRun: true,
        reasonHe: this.opts.dryRun ? "Dry-run פעיל" : "חסרים credentials של iCount — מחזיר dry-run",
      };
    }

    const url = `${this.opts.baseUrl ?? "https://api.icount.co.il/api/v3.php/doc/create"}`;
    const body = {
      cid: this.opts.cid,
      token: this.opts.token,
      doctype: "invrec",
      client_name: payload.customer.name,
      vat_id: payload.customer.taxId,
      email: payload.customer.email,
      issue_date: payload.issueDate,
      items: payload.lines.map((l) => ({
        description: l.description,
        unitprice_incvat: l.unitPriceIls * (1 + l.vatPercent / 100),
        quantity: l.quantity,
      })),
      external_id: payload.internalRef,
    };
    const f = this.opts.fetchImpl ?? fetch;
    const resp = await f(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await resp.json().catch(() => ({}))) as { status?: boolean; docnum?: string };
    if (!resp.ok || json.status === false) {
      return { success: false, raw: json, dryRun: false, reasonHe: "iCount דחה את הבקשה" };
    }
    return {
      success: true,
      invoiceNumber: json.docnum,
      totalIls: totalRounded,
      raw: json,
      dryRun: false,
    };
  }
}
