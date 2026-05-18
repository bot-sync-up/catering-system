import axios, { type AxiosInstance } from 'axios';
import type { Invoice } from '../vision/schema.js';

/**
 * Minimal iCount API v3 client. iCount accepts JSON/form-encoded calls
 * to api/v3.php with a `cid`+`user`+`pass` auth envelope per request.
 * https://api.icount.co.il/api/v3/
 */
export interface ICountConfig {
  baseUrl?: string;
  cid: string;
  user: string;
  pass: string;
}

export interface ICountInvoiceResponse {
  status: boolean;
  doc_url?: string;
  docnum?: number;
  errors?: unknown;
}

export class ICountClient {
  private http: AxiosInstance;
  constructor(private readonly cfg: ICountConfig) {
    this.http = axios.create({
      baseURL: cfg.baseUrl ?? 'https://api.icount.co.il/api/v3.php',
      timeout: 30_000,
    });
  }

  /**
   * Create a "purchase invoice" (חשבונית רכש) in iCount mirroring the
   * supplier-issued invoice we just OCR'd.
   */
  async createPurchaseInvoice(
    invoice: Invoice,
    iCountSupplierId?: string,
  ): Promise<ICountInvoiceResponse> {
    const payload = {
      cid: this.cfg.cid,
      user: this.cfg.user,
      pass: this.cfg.pass,
      doctype: 'purchase_invoice',
      client_id: iCountSupplierId,
      client_name: invoice.supplier.name,
      vat_id: invoice.supplier.taxId,
      issue_date: invoice.date,
      due_date: invoice.dueDate ?? invoice.date,
      currency_code: invoice.currency || 'ILS',
      doc_ref: invoice.invoiceNum,
      items: invoice.items.map((it) => ({
        description: it.desc,
        quantity: it.qty,
        unitprice: it.price,
        vat_rate: Math.round(it.vat * 100),
        catalog_number: it.sku,
      })),
      lang: 'he',
    };
    const { data } = await this.http.post<ICountInvoiceResponse>('/doc/create', payload);
    if (!data.status) {
      throw new Error(`iCount rejected invoice: ${JSON.stringify(data.errors)}`);
    }
    return data;
  }
}

export function iCountFromEnv(): ICountClient | null {
  const { ICOUNT_COMPANY_ID, ICOUNT_USER, ICOUNT_PASSWORD, ICOUNT_BASE_URL } = process.env;
  if (!ICOUNT_COMPANY_ID || !ICOUNT_USER || !ICOUNT_PASSWORD) return null;
  return new ICountClient({
    cid: ICOUNT_COMPANY_ID,
    user: ICOUNT_USER,
    pass: ICOUNT_PASSWORD,
    baseUrl: ICOUNT_BASE_URL,
  });
}
