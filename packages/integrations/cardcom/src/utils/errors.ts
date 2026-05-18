export class CardComError extends Error {
  readonly code: string;
  readonly httpStatus?: number;
  readonly raw?: unknown;
  readonly retryable: boolean;

  constructor(opts: {
    code: string;
    message: string;
    httpStatus?: number;
    raw?: unknown;
    retryable?: boolean;
  }) {
    super(opts.message);
    this.name = 'CardComError';
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
    this.raw = opts.raw;
    this.retryable = opts.retryable ?? false;
  }
}

const RETRYABLE_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);
// CardCom ResponseCode 0 = success. Treat selected codes as retryable.
const RETRYABLE_CODES = new Set(['200', '901', '902', '903']);

export function isRetryable(httpStatus?: number, responseCode?: string): boolean {
  if (httpStatus && RETRYABLE_HTTP.has(httpStatus)) return true;
  if (responseCode && RETRYABLE_CODES.has(String(responseCode))) return true;
  return false;
}
