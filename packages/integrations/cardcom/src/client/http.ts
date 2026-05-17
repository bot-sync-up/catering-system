import axios, { AxiosInstance, AxiosError } from 'axios';
import { CardComConfig } from '../types';
import { CardComError, isRetryable } from '../utils/errors';
import { withRetry } from '../utils/retry';
import { logger } from '../utils/logger';

export interface CardComResponse<T = unknown> {
  ResponseCode?: number | string;
  Description?: string;
  [k: string]: unknown;
  // Some endpoints nest result in TranzactionInfo / TokenInfo etc.
  data?: T;
}

export class CardComHttpClient {
  private readonly axios: AxiosInstance;
  constructor(private readonly cfg: CardComConfig) {
    this.axios = axios.create({
      baseURL: cfg.baseUrl,
      timeout: cfg.timeoutMs,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });
  }

  /**
   * Auth: CardCom v11 expects ApiName + ApiPassword (or Username) inside the body.
   * We always inject TerminalNumber / ApiName / ApiPassword if present.
   */
  private withAuth<T extends Record<string, unknown>>(body: T): T & {
    TerminalNumber: number;
    ApiName: string;
    ApiPassword?: string;
    UserName?: string;
  } {
    return {
      ...body,
      TerminalNumber: this.cfg.terminal,
      ApiName: this.cfg.apiName,
      UserName: this.cfg.username,
      ...(this.cfg.apiPassword ? { ApiPassword: this.cfg.apiPassword } : {}),
    };
  }

  async post<T = unknown>(
    path: string,
    body: Record<string, unknown>,
    opts: { flow: string; idempotencyKey?: string } = { flow: 'unknown' }
  ): Promise<CardComResponse<T>> {
    const start = Date.now();
    return withRetry(
      async (attempt) => {
        try {
          const res = await this.axios.post<CardComResponse<T>>(
            path,
            this.withAuth(body),
            {
              headers: opts.idempotencyKey
                ? { 'Idempotency-Key': opts.idempotencyKey }
                : undefined,
            }
          );
          const code = String(res.data?.ResponseCode ?? '0');
          if (code !== '0') {
            const retryable = isRetryable(res.status, code);
            const err = new CardComError({
              code,
              message: res.data?.Description ?? `CardCom ResponseCode=${code}`,
              httpStatus: res.status,
              raw: res.data,
              retryable,
            });
            logger.warn(
              { flow: opts.flow, attempt, code, status: res.status },
              'CardCom non-zero response'
            );
            throw err;
          }
          logger.info(
            { flow: opts.flow, attempt, ms: Date.now() - start },
            'CardCom call ok'
          );
          return res.data;
        } catch (e) {
          if (e instanceof CardComError) throw e;
          const ax = e as AxiosError;
          const status = ax.response?.status;
          const retryable = isRetryable(status);
          throw new CardComError({
            code: ax.code ?? 'NETWORK',
            message: ax.message,
            httpStatus: status,
            raw: ax.response?.data,
            retryable,
          });
        }
      },
      {
        maxAttempts: 4,
        isRetryable: (e) => (e instanceof CardComError ? e.retryable : true),
      }
    );
  }
}
