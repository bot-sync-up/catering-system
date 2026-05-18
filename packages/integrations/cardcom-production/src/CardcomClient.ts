/**
 * CardcomClient — production-grade Cardcom HTTP client.
 *
 * Design principles:
 *   - Zero-PCI: this client NEVER accepts raw PAN/CVV.
 *     Card data is collected on Cardcom hosted pages (LowProfile iframe)
 *     and converted into a token. All further operations use the token.
 *   - All methods validate inputs with Zod (`*Schema.parse(input)`).
 *   - All transient failures are retried with exponential backoff + jitter.
 *   - Charge operations are idempotency-key protected.
 *   - 3DS PA Authorization with single retry on 901/902/903 is built-in.
 */
import axios, { type AxiosInstance } from 'axios';
import {
  CardcomCredentialsSchema,
  ChargeInputSchema,
  ChargeResponseSchema,
  CreateRecurringInputSchema,
  CancelRecurringInputSchema,
  LowProfileCreateInputSchema,
  LowProfileCreateResponseSchema,
  LowProfileResultSchema,
  RefundInputSchema,
  RefundResponseSchema,
  TokenizeInputSchema,
  TokenizeResponseSchema,
  type CardcomCredentials,
  type ChargeInput,
  type ChargeResponse,
  type CreateRecurringInput,
  type CancelRecurringInput,
  type Environment,
  type LowProfileCreateInput,
  type LowProfileCreateResponse,
  type LowProfileResult,
  type RefundInput,
  type RefundResponse,
  type RecurringResponse,
  type ThreeDsRequest,
  type ThreeDsCompleteInput,
  type TokenizeInput,
  type TokenizeResponse,
} from './types';
import { buildAuthPayload, redactSecrets } from './auth';
import { CardcomError, fromAxiosError } from './errors';
import { withRetry, type RetryOptions } from './retry';
import {
  MemoryIdempotencyStore,
  generateIdempotencyKey,
  runIdempotent,
  type IdempotencyStore,
} from './idempotency';
import { resolveBaseUrl } from './env';
import { ThreeDsService } from './3ds';

export interface CardcomClientOptions {
  credentials: CardcomCredentials;
  environment: Environment;
  baseUrlOverride?: string;
  /** Connection timeout in ms (default 30000). */
  timeoutMs?: number;
  /** Idempotency store for `charge`. Defaults to in-memory (DEV ONLY). */
  idempotencyStore?: IdempotencyStore;
  retry?: RetryOptions;
  /** Provide a custom axios instance — handy for tests / nock. */
  httpClient?: AxiosInstance;
  /** Optional logger (pino-shaped). */
  logger?: { info: Function; warn: Function; error: Function; debug?: Function };
}

const DEFAULT_TIMEOUT = 30_000;

function currencyToCoinId(currency: string): number {
  switch (currency) {
    case 'ILS':
      return 1;
    case 'USD':
      return 2;
    case 'EUR':
      return 978;
    case 'GBP':
      return 826;
    default:
      return 1;
  }
}

export class CardcomClient {
  private readonly http: AxiosInstance;
  private readonly creds: CardcomCredentials;
  private readonly idempotencyStore: IdempotencyStore;
  private readonly retryOpts: RetryOptions;
  private readonly logger?: CardcomClientOptions['logger'];
  public readonly threeDs: ThreeDsService;
  public readonly environment: Environment;
  public readonly baseUrl: string;

  constructor(opts: CardcomClientOptions) {
    this.creds = CardcomCredentialsSchema.parse(opts.credentials);
    this.environment = opts.environment;
    this.baseUrl = resolveBaseUrl(opts.environment, opts.baseUrlOverride);
    this.idempotencyStore = opts.idempotencyStore ?? new MemoryIdempotencyStore();
    this.retryOpts = opts.retry ?? {};
    this.logger = opts.logger;

    this.http =
      opts.httpClient ??
      axios.create({
        baseURL: this.baseUrl,
        timeout: opts.timeoutMs ?? DEFAULT_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': '@syncup/cardcom-production/1.0',
        },
        // tolerate the full 1xx-499 range; we interpret ResponseCode ourselves
        validateStatus: (s) => s < 500,
      });

    this.threeDs = new ThreeDsService(this.http, this.creds);
  }

  // ============================================================================
  // LowProfile (iframe / hosted page)
  // ============================================================================

  /**
   * Create a LowProfile session and return the iframe URL.
   * The iframe will POST results back to your `webHookUrl` and redirect
   * the customer to `successUrl` (ResponseCode=0) or `failedUrl` (9XX).
   */
  async createLowProfile(input: LowProfileCreateInput): Promise<LowProfileCreateResponse> {
    const parsed = LowProfileCreateInputSchema.parse(input);
    const body = {
      ...buildAuthPayload(this.creds),
      Amount: parsed.amount,
      CoinId: currencyToCoinId(parsed.currency),
      SuccessRedirectUrl: parsed.successUrl,
      FailedRedirectUrl: parsed.failedUrl,
      WebHookUrl: parsed.webHookUrl,
      ProductName: parsed.productName,
      Operation: parsed.operation,
      Language: parsed.language,
      ReturnValue: parsed.returnValue,
      NumOfPayments: parsed.numOfPayments,
      InvoiceFullName: parsed.invoiceFullName,
      InvoiceEmail: parsed.invoiceEmail,
      InvoicePhone: parsed.invoicePhone,
    };

    return withRetry(async () => {
      try {
        const { data } = await this.http.post('/LowProfile/Create', body);
        const out = LowProfileCreateResponseSchema.parse(data);
        if (out.ResponseCode !== 0) {
          throw new CardcomError(
            out.Description ?? `LowProfile.Create failed (${out.ResponseCode})`,
            { responseCode: out.ResponseCode },
          );
        }
        return out;
      } catch (err) {
        if (err instanceof CardcomError) throw err;
        throw fromAxiosError(err);
      }
    }, this.retryOpts);
  }

  /**
   * Fetch result of a LowProfile session by id.
   * Use this after the iframe posted back. ResponseCode 0 = success, 9XX = failure.
   */
  async getLowProfileResult(lowProfileId: string): Promise<LowProfileResult> {
    if (!lowProfileId) throw new CardcomError('lowProfileId is required');
    return withRetry(async () => {
      try {
        const { data } = await this.http.post('/LowProfile/GetLpResult', {
          ...buildAuthPayload(this.creds),
          LowProfileId: lowProfileId,
        });
        return LowProfileResultSchema.parse(data);
      } catch (err) {
        throw fromAxiosError(err);
      }
    }, this.retryOpts);
  }

  // ============================================================================
  // Charge — idempotent
  // ============================================================================

  async charge(input: ChargeInput): Promise<ChargeResponse> {
    const parsed = ChargeInputSchema.parse(input);
    const idempotencyKey = parsed.idempotencyKey ?? generateIdempotencyKey();
    const body = {
      ...buildAuthPayload(this.creds),
      Amount: parsed.amount,
      CoinId: currencyToCoinId(parsed.currency),
      Token: parsed.token,
      CardExpirationMonth: parsed.cardExpiry?.month,
      CardExpirationYear: parsed.cardExpiry?.year,
      NumOfPayments: parsed.numOfPayments ?? 1,
      ProductName: parsed.productName,
      ExternalUniqTranId: parsed.externalUniqTranId,
      ReturnValue: parsed.returnValue,
    };

    this.logger?.info?.(
      { op: 'charge', idempotencyKey, body: redactSecrets(body) },
      'Cardcom charge requested',
    );

    return runIdempotent(this.idempotencyStore, idempotencyKey, body, () =>
      withRetry(async () => {
        try {
          const { data } = await this.http.post('/Transactions/Transaction', body, {
            headers: { 'Idempotency-Key': idempotencyKey },
          });
          const out = ChargeResponseSchema.parse(data);
          if (out.ResponseCode !== 0) {
            throw new CardcomError(
              out.Description ?? `Charge failed (${out.ResponseCode})`,
              { responseCode: out.ResponseCode },
            );
          }
          return out;
        } catch (err) {
          if (err instanceof CardcomError) throw err;
          throw fromAxiosError(err);
        }
      }, this.retryOpts),
    );
  }

  // ============================================================================
  // Refund
  // ============================================================================

  async refund(input: RefundInput): Promise<RefundResponse> {
    const parsed = RefundInputSchema.parse(input);
    return withRetry(async () => {
      try {
        const { data } = await this.http.post('/Transactions/RefundByTransactionId', {
          ...buildAuthPayload(this.creds),
          TransactionId: parsed.tranzactionId,
          PartialSum: parsed.partialSum,
          ExternalUniqTranId: parsed.externalUniqTranId,
        });
        const out = RefundResponseSchema.parse(data);
        if (out.ResponseCode !== 0) {
          throw new CardcomError(
            out.Description ?? `Refund failed (${out.ResponseCode})`,
            { responseCode: out.ResponseCode },
          );
        }
        return out;
      } catch (err) {
        if (err instanceof CardcomError) throw err;
        throw fromAxiosError(err);
      }
    }, this.retryOpts);
  }

  // ============================================================================
  // Tokenize — ZERO-PCI: token-only input.
  // ============================================================================

  async tokenize(input: TokenizeInput): Promise<TokenizeResponse> {
    // Defense in depth — guard against the caller sneaking PAN/CVV.
    const reject = ['cardNumber', 'CardNumber', 'pan', 'PAN', 'cvv', 'CVV'];
    for (const k of reject) {
      if (k in (input as object)) {
        throw new CardcomError(
          `Tokenize must not receive raw card data (${k}). Use LowProfile to obtain a token.`,
          { retryable: false },
        );
      }
    }
    const parsed = TokenizeInputSchema.parse(input);
    return withRetry(async () => {
      try {
        const { data } = await this.http.post('/Tokens/CreateTokenFromToken', {
          ...buildAuthPayload(this.creds),
          Token: parsed.token,
          CardExpirationMonth: parsed.cardExpiry?.month,
          CardExpirationYear: parsed.cardExpiry?.year,
          CardOwnerName: parsed.cardOwnerName,
          CardOwnerId: parsed.cardOwnerId,
        });
        const out = TokenizeResponseSchema.parse(data);
        if (out.ResponseCode !== 0) {
          throw new CardcomError(
            out.Description ?? `Tokenize failed (${out.ResponseCode})`,
            { responseCode: out.ResponseCode },
          );
        }
        return out;
      } catch (err) {
        if (err instanceof CardcomError) throw err;
        throw fromAxiosError(err);
      }
    }, this.retryOpts);
  }

  // ============================================================================
  // Recurring
  // ============================================================================

  async createRecurring(input: CreateRecurringInput): Promise<RecurringResponse> {
    const parsed = CreateRecurringInputSchema.parse(input);
    return withRetry(async () => {
      try {
        const { data } = await this.http.post('/Recurring/Create', {
          ...buildAuthPayload(this.creds),
          Token: parsed.token,
          Amount: parsed.amount,
          CoinId: currencyToCoinId(parsed.currency),
          ProductName: parsed.productName,
          Interval: parsed.interval,
          StartAt: parsed.startAt.toISOString(),
          TotalPayments: parsed.totalPayments,
          CustomerEmail: parsed.customerEmail,
        });
        if (typeof data?.ResponseCode === 'number' && data.ResponseCode !== 0) {
          throw new CardcomError(
            data.Description ?? `CreateRecurring failed (${data.ResponseCode})`,
            { responseCode: data.ResponseCode },
          );
        }
        return data as RecurringResponse;
      } catch (err) {
        if (err instanceof CardcomError) throw err;
        throw fromAxiosError(err);
      }
    }, this.retryOpts);
  }

  async cancelRecurring(input: CancelRecurringInput): Promise<{ ResponseCode: number; Description?: string }> {
    const parsed = CancelRecurringInputSchema.parse(input);
    return withRetry(async () => {
      try {
        const { data } = await this.http.post('/Recurring/Cancel', {
          ...buildAuthPayload(this.creds),
          RecurringId: parsed.recurringId,
          Reason: parsed.reason,
        });
        if (typeof data?.ResponseCode === 'number' && data.ResponseCode !== 0) {
          throw new CardcomError(
            data.Description ?? `CancelRecurring failed (${data.ResponseCode})`,
            { responseCode: data.ResponseCode },
          );
        }
        return data;
      } catch (err) {
        if (err instanceof CardcomError) throw err;
        throw fromAxiosError(err);
      }
    }, this.retryOpts);
  }

  // ============================================================================
  // 3DS — facade delegating to ThreeDsService
  // ============================================================================

  authorize3ds(input: ThreeDsRequest) {
    return this.threeDs.authorize(input);
  }

  complete3ds(input: ThreeDsCompleteInput) {
    return this.threeDs.complete(input);
  }
}
