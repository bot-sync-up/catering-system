/**
 * Error taxonomy + retry classification.
 */

export class CardcomError extends Error {
  public readonly responseCode?: number;
  public readonly httpStatus?: number;
  public readonly retryable: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    opts: {
      responseCode?: number;
      httpStatus?: number;
      retryable?: boolean;
      details?: Record<string, unknown>;
    } = {},
  ) {
    super(message);
    this.name = 'CardcomError';
    this.responseCode = opts.responseCode;
    this.httpStatus = opts.httpStatus;
    this.retryable = opts.retryable ?? false;
    this.details = opts.details;
  }
}

export class CardcomValidationError extends CardcomError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { retryable: false, details });
    this.name = 'CardcomValidationError';
  }
}

export class CardcomAuthError extends CardcomError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { retryable: false, details });
    this.name = 'CardcomAuthError';
  }
}

export class CardcomWebhookError extends CardcomError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { retryable: false, details });
    this.name = 'CardcomWebhookError';
  }
}

export class CardcomThreeDsError extends CardcomError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { retryable: false, details });
    this.name = 'CardcomThreeDsError';
  }
}

// ResponseCodes that indicate transient issues at Cardcom side.
const RETRYABLE_RESPONSE_CODES = new Set([901, 902, 903]);

// HTTP statuses that are safe to retry (transient / rate-limit / server).
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export function isRetryable(input: {
  responseCode?: number;
  httpStatus?: number;
  errorCode?: string;
}): boolean {
  if (input.responseCode != null && RETRYABLE_RESPONSE_CODES.has(input.responseCode)) {
    return true;
  }
  if (input.httpStatus != null && RETRYABLE_HTTP_STATUSES.has(input.httpStatus)) {
    return true;
  }
  if (
    input.errorCode === 'ECONNRESET' ||
    input.errorCode === 'ETIMEDOUT' ||
    input.errorCode === 'ECONNABORTED' ||
    input.errorCode === 'EAI_AGAIN'
  ) {
    return true;
  }
  return false;
}

export function fromAxiosError(err: unknown): CardcomError {
  // duck-typed to avoid importing axios in error layer
  const anyErr = err as {
    response?: { status?: number; data?: { ResponseCode?: number; Description?: string } };
    code?: string;
    message?: string;
  };
  const httpStatus = anyErr?.response?.status;
  const responseCode = anyErr?.response?.data?.ResponseCode;
  const description = anyErr?.response?.data?.Description ?? anyErr?.message ?? 'Cardcom request failed';

  const retryable = isRetryable({ responseCode, httpStatus, errorCode: anyErr?.code });

  return new CardcomError(description, {
    responseCode,
    httpStatus,
    retryable,
    details: { code: anyErr?.code },
  });
}
