/**
 * IcountClient — production client לאינטגרציה מול iCount.
 * תוכנה מאושרת מס' 1346 מטעם רשות המסים בישראל.
 *
 * תיעוד API: https://api.icount.co.il/api/v3.php
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  IcountCredentials,
  IcountClientOptions,
  InvoiceRequest,
  InvoiceResponse,
  AllocationRequest,
  AllocationResponse,
  Customer,
  Supplier,
  DocumentType,
  Logger,
  IntegrationLogEntry,
  InvoiceRequestSchema,
} from './types';
import { APPROVED_SOFTWARE_NUMBER, getSoftware1346Headers } from './compliance/software1346';

const DEFAULT_BASE_URL = 'https://api.icount.co.il/api/v3.php';
const DEFAULT_TIMEOUT = 30_000;

export class IcountError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly response?: unknown,
  ) {
    super(message);
    this.name = 'IcountError';
  }
}

export class IcountClient {
  private readonly http: AxiosInstance;
  private readonly creds: IcountCredentials;
  private readonly logger?: Logger;
  private readonly approvedSoftwareNumber: string;
  private readonly logSink: IntegrationLogEntry[] = [];
  private sid?: string;

  constructor(private readonly opts: IcountClientOptions) {
    this.creds = opts.credentials;
    this.logger = opts.logger;
    this.approvedSoftwareNumber = opts.approvedSoftwareNumber ?? APPROVED_SOFTWARE_NUMBER;

    this.http = axios.create({
      baseURL: opts.baseUrl ?? DEFAULT_BASE_URL,
      timeout: opts.timeout ?? DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': `SyncUp-iCount/1.0 (ApprovedSW:${this.approvedSoftwareNumber})`,
        ...getSoftware1346Headers(this.approvedSoftwareNumber),
      },
    });
  }

  // ===========================================================
  // Authentication
  // ===========================================================

  private getAuthPayload(): Record<string, string> {
    const payload: Record<string, string> = {
      cid: this.creds.cid,
    };
    if (this.creds.apiToken) {
      payload['api_token'] = this.creds.apiToken;
    } else {
      payload['user'] = this.creds.user;
      payload['pass'] = this.creds.password;
    }
    if (this.sid) {
      payload['sid'] = this.sid;
    }
    return payload;
  }

  async login(): Promise<void> {
    const resp = await this.call<{ status: boolean; sid?: string }>(
      'authenticate',
      'auth/login',
      { user: this.creds.user, pass: this.creds.password, cid: this.creds.cid },
    );
    if (!resp.status || !resp.sid) {
      throw new IcountError('Login failed', 'AUTH_FAILED');
    }
    this.sid = resp.sid;
  }

  // ===========================================================
  // Generic HTTP call with logging
  // ===========================================================

  private async call<T>(
    operation: string,
    path: string,
    body: Record<string, unknown>,
    config?: AxiosRequestConfig,
    attempt = 1,
  ): Promise<T> {
    const start = Date.now();
    const id = uuidv4();
    const url = `${this.opts.baseUrl ?? DEFAULT_BASE_URL}/${path}`;
    const payload = { ...this.getAuthPayload(), ...body };

    this.logger?.debug(`[iCount] ${operation}`, { url, id });

    try {
      const { data, status } = await this.http.post<T>(`/${path}`, payload, config);
      const duration = Date.now() - start;

      this.logSink.push({
        id,
        timestamp: new Date().toISOString(),
        provider: 'icount',
        operation,
        method: 'POST',
        url,
        request_payload: this.sanitize(payload),
        response_payload: data,
        status_code: status,
        success: true,
        attempt,
        duration_ms: duration,
        cid: this.creds.cid,
      });
      return data;
    } catch (err) {
      const duration = Date.now() - start;
      const axiosErr = err as AxiosError;
      const message = axiosErr.message ?? 'Unknown error';

      this.logSink.push({
        id,
        timestamp: new Date().toISOString(),
        provider: 'icount',
        operation,
        method: 'POST',
        url,
        request_payload: this.sanitize(payload),
        response_payload: axiosErr.response?.data,
        status_code: axiosErr.response?.status,
        success: false,
        error: message,
        attempt,
        duration_ms: duration,
        cid: this.creds.cid,
      });

      this.logger?.error(`[iCount] ${operation} failed`, { err: message, attempt });

      throw new IcountError(
        message,
        (axiosErr.response?.data as { error_code?: string })?.error_code,
        axiosErr.response?.status,
        axiosErr.response?.data,
      );
    }
  }

  private sanitize(p: Record<string, unknown>): Record<string, unknown> {
    const clone = { ...p };
    if ('pass' in clone) clone.pass = '***';
    if ('api_token' in clone) clone.api_token = '***';
    if ('password' in clone) clone.password = '***';
    return clone;
  }

  getIntegrationLog(): IntegrationLogEntry[] {
    return [...this.logSink];
  }

  // ===========================================================
  // Documents
  // ===========================================================

  async createInvoice(req: InvoiceRequest): Promise<InvoiceResponse> {
    InvoiceRequestSchema.parse(req);
    return this.call<InvoiceResponse>('createInvoice', 'doc/create', {
      ...req,
      doctype: req.doctype ?? DocumentType.INVOICE,
    });
  }

  async createTaxInvoice(req: Omit<InvoiceRequest, 'doctype'>): Promise<InvoiceResponse> {
    return this.createInvoice({ ...req, doctype: DocumentType.TAX_INVOICE });
  }

  async createReceipt(req: Omit<InvoiceRequest, 'doctype'>): Promise<InvoiceResponse> {
    return this.createInvoice({ ...req, doctype: DocumentType.RECEIPT });
  }

  async createQuote(req: Omit<InvoiceRequest, 'doctype'>): Promise<InvoiceResponse> {
    return this.createInvoice({ ...req, doctype: DocumentType.QUOTE });
  }

  async createCreditNote(
    req: Omit<InvoiceRequest, 'doctype'> & { original_doc_id?: number },
  ): Promise<InvoiceResponse> {
    return this.createInvoice({ ...req, doctype: DocumentType.CREDIT_NOTE });
  }

  // ===========================================================
  // Allocation Number — Israel Model 1346
  // ===========================================================

  async getAllocationNumber(req: AllocationRequest): Promise<AllocationResponse> {
    return this.call<AllocationResponse>('getAllocationNumber', 'allocation/request', {
      ...req,
      software_id: this.approvedSoftwareNumber,
    });
  }

  // ===========================================================
  // Reports
  // ===========================================================

  async getVATReport(params: { year: number; month?: number }): Promise<unknown> {
    return this.call('getVATReport', 'report/vat', params as Record<string, unknown>);
  }

  async listTransactions(params: {
    from: string;
    to: string;
    doctype?: DocumentType;
    page?: number;
    limit?: number;
  }): Promise<{ items: unknown[]; total: number }> {
    return this.call('listTransactions', 'doc/search', params as Record<string, unknown>);
  }

  // ===========================================================
  // Cancellation
  // ===========================================================

  async cancelDocument(params: {
    doc_id?: number;
    docnum?: string;
    reason: string;
  }): Promise<{ status: boolean; cancellation_doc_id?: number }> {
    return this.call('cancelDocument', 'doc/cancel', params as Record<string, unknown>);
  }

  // ===========================================================
  // Customers & Suppliers
  // ===========================================================

  async syncCustomer(customer: Customer): Promise<{ status: boolean; client_id: string }> {
    return this.call('syncCustomer', 'client/create_or_update', customer as unknown as Record<string, unknown>);
  }

  async syncSupplier(supplier: Supplier): Promise<{ status: boolean; supplier_id: string }> {
    return this.call('syncSupplier', 'supplier/create_or_update', supplier as unknown as Record<string, unknown>);
  }

  // ===========================================================
  // Health
  // ===========================================================

  async ping(): Promise<boolean> {
    try {
      const r = await this.call<{ status: boolean }>('ping', 'main/info', {});
      return r.status === true;
    } catch {
      return false;
    }
  }
}
