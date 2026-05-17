/**
 * iCount REST API Client
 * Wraps axios with auth, retries, validation, and error mapping
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import { v4 as uuidv4 } from 'uuid';

import {
  ICountConfig,
  ICountError,
  ICountAuthError,
  ICountRateLimitError,
  ICountValidationError,
} from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('rest-client');

const DEFAULT_BASE_URL = 'https://api.icount.co.il/api/v3.php';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;

export interface RequestOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, unknown>;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export class RestClient {
  private readonly http: AxiosInstance;
  private readonly config: Required<Pick<ICountConfig,
    'apiKey' | 'companyId' | 'baseUrl' | 'timeout' | 'maxRetries' | 'isProduction'>>;

  constructor(config: ICountConfig) {
    if (!config.apiKey) {
      throw new ICountValidationError('ICOUNT_API_KEY is required');
    }
    if (!config.companyId) {
      throw new ICountValidationError('COMPANY_ID is required');
    }

    this.config = {
      apiKey: config.apiKey,
      companyId: config.companyId,
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      timeout: config.timeout ?? DEFAULT_TIMEOUT_MS,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      isProduction: config.isProduction ?? true,
    };

    this.http = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': '@aneh-hashoel/icount/0.1.0',
      },
    });

    // Exponential backoff retries (idempotent requests + 429/5xx)
    axiosRetry(this.http, {
      retries: this.config.maxRetries,
      retryDelay: (retryCount: number) => {
        const base = Math.pow(2, retryCount) * 250;
        const jitter = Math.floor(Math.random() * 200);
        return base + jitter;
      },
      retryCondition: (err: AxiosError) => {
        if (isNetworkOrIdempotentRequestError(err)) return true;
        const status = err.response?.status ?? 0;
        return status === 429 || status >= 500;
      },
      onRetry: (retryCount: number, err: AxiosError) => {
        log.warn(
          { retryCount, status: err.response?.status, url: err.config?.url },
          'retrying request',
        );
      },
    });

    // Request interceptor - inject auth into body
    this.http.interceptors.request.use((req) => {
      const requestId = uuidv4();
      req.headers.set('X-Request-ID', requestId);
      log.debug({ requestId, url: req.url, method: req.method }, 'outgoing request');
      return req;
    });

    // Response interceptor - map errors
    this.http.interceptors.response.use(
      (res) => res,
      (err: AxiosError) => Promise.reject(this.mapError(err)),
    );
  }

  async request<T = unknown>(opts: RequestOptions): Promise<T> {
    const body = {
      cid: this.config.companyId,
      api_token: this.config.apiKey,
      ...(opts.data ?? {}),
    };

    const requestConfig: AxiosRequestConfig = {
      url: opts.endpoint,
      method: opts.method ?? 'POST',
      data: body,
      params: opts.params,
      headers: opts.headers,
    };

    const start = Date.now();
    try {
      const res = await this.http.request<T>(requestConfig);
      log.debug(
        { url: opts.endpoint, durationMs: Date.now() - start, status: res.status },
        'request ok',
      );
      return res.data;
    } catch (err) {
      log.error(
        { url: opts.endpoint, durationMs: Date.now() - start, err: (err as Error).message },
        'request failed',
      );
      throw err;
    }
  }

  async get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>({ endpoint, method: 'GET', params });
  }

  async post<T = unknown>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    return this.request<T>({ endpoint, method: 'POST', data });
  }

  private mapError(err: AxiosError): Error {
    const status = err.response?.status;
    const responseData = err.response?.data as Record<string, unknown> | undefined;
    const message = (responseData?.error_description as string)
      ?? (responseData?.reason as string)
      ?? err.message;

    if (status === 401 || status === 403) {
      return new ICountAuthError(message, responseData);
    }
    if (status === 429) {
      const retryHeader = err.response?.headers?.['retry-after'];
      const retryAfter = retryHeader ? Number.parseInt(String(retryHeader), 10) : undefined;
      return new ICountRateLimitError(message, retryAfter, responseData);
    }
    if (status === 400 || status === 422) {
      return new ICountValidationError(message, responseData);
    }

    return new ICountError(
      message ?? 'Unknown iCount API error',
      'API_ERROR',
      status,
      responseData,
    );
  }

  getConfig(): Readonly<typeof this.config> {
    return this.config;
  }
}
