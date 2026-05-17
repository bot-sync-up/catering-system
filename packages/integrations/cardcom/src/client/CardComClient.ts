import { CardComHttpClient } from './http';
import {
  CardComConfig,
  CardComConfigSchema,
  CreateLowProfileInput,
  CreateLowProfileInputSchema,
  CreateLowProfileResult,
  ChargeInput,
  ChargeInputSchema,
  ChargeResult,
  RefundInput,
  RefundInputSchema,
  RefundResult,
  TokenizeInput,
  TokenizeInputSchema,
  TokenizeResult,
  CreateRecurringInput,
  CreateRecurringInputSchema,
  CreateRecurringResult,
  CancelRecurringInput,
  CancelRecurringInputSchema,
  CancelRecurringResult,
} from '../types';
import { logger } from '../utils/logger';

const PATHS = {
  lowProfile: '/api/v11/LowProfile/Create',
  charge: '/api/v11/Transactions/Transaction',
  refund: '/api/v11/Transactions/RefundByTransactionId',
  tokenize: '/api/v11/Token/CreateTokenByDeal',
  recurringCreate: '/api/v11/AccountReceivable/CreateRecurringPayment',
  recurringCancel: '/api/v11/AccountReceivable/CancelRecurringPayment',
};

export class CardComClient {
  readonly http: CardComHttpClient;
  readonly cfg: CardComConfig;

  constructor(cfg: Partial<CardComConfig>) {
    this.cfg = CardComConfigSchema.parse({
      baseUrl: process.env.CARDCOM_BASE_URL ?? 'https://secure.cardcom.solutions',
      timeoutMs: 30_000,
      ...cfg,
    });
    this.http = new CardComHttpClient(this.cfg);
  }

  // ===== LowProfile (iframe, zero-PCI) =====
  async createLowProfile(input: CreateLowProfileInput): Promise<CreateLowProfileResult> {
    const i = CreateLowProfileInputSchema.parse(input);
    const body: Record<string, unknown> = {
      Amount: i.amount,
      NumOfPayments: i.numOfPayments,
      ProductName: i.productName,
      Language: i.language,
      ISOCoinId: i.isoCoinId,
      SuccessRedirectUrl: i.successUrl,
      FailedRedirectUrl: i.failedUrl,
      WebHookUrl: i.webhookUrl,
      Operation: i.operation,
      // Wallets
      AdvancedDefinition: {
        IsBitPay: i.enableBit,
        IsGooglePay: i.enableGooglePay,
        IsApplePay: i.enableApplePay,
      },
      ...(i.customer && {
        UIDefinition: {
          FullName: i.customer.fullName,
          Email: i.customer.email,
          Phone: i.customer.phone,
          IdNumber: i.customer.idNumber,
        },
      }),
      ...(i.extra ?? {}),
    };
    const res = await this.http.post<{ LowProfileId?: string; Url?: string }>(
      PATHS.lowProfile,
      body,
      { flow: 'lowprofile.create' }
    );
    const lpId = (res as Record<string, unknown>).LowProfileId as string;
    const url = (res as Record<string, unknown>).Url as string;
    return { lowProfileId: lpId, url, raw: res };
  }

  // ===== Direct charge (token preferred) =====
  async charge(input: ChargeInput): Promise<ChargeResult> {
    const i = ChargeInputSchema.parse(input);
    const body: Record<string, unknown> = {
      Amount: i.amount,
      NumOfPayments: i.numOfPayments,
      ISOCoinId: i.isoCoinId,
      ...(i.token ? { Token: i.token } : {}),
      ...(i.cardOwner && {
        CardOwnerInformation: {
          FullName: i.cardOwner.fullName,
          IdentityNumber: i.cardOwner.idNumber,
          Phone: i.cardOwner.phone,
          Email: i.cardOwner.email,
        },
      }),
      ...(i.productName && { ProductName: i.productName }),
      Document: i.documentToCreate === 'None' ? undefined : { Type: i.documentToCreate },
      ...(i.extra ?? {}),
    };
    const res = await this.http.post(PATHS.charge, body, { flow: 'charge' });
    const r = res as Record<string, unknown>;
    return {
      transactionId: String(r.TranzactionId ?? r.TransactionId ?? ''),
      approvalNumber: r.ApprovalNumber as string | undefined,
      amount: i.amount,
      raw: res,
    };
  }

  // ===== Refund (full or partial) =====
  async refund(input: RefundInput): Promise<RefundResult> {
    const i = RefundInputSchema.parse(input);
    const body: Record<string, unknown> = {
      TranzactionId: i.transactionId,
      ...(i.amount && { PartialSum: i.amount }),
      ...(i.reason && { Reason: i.reason }),
    };
    const res = await this.http.post(PATHS.refund, body, { flow: 'refund' });
    const r = res as Record<string, unknown>;
    return {
      refundTransactionId: String(r.NewTranzactionId ?? r.TranzactionId ?? ''),
      raw: res,
    };
  }

  // ===== Tokenize (zero-PCI: prefer fromTransactionId, never raw cards in app) =====
  async tokenize(input: TokenizeInput): Promise<TokenizeResult> {
    const i = TokenizeInputSchema.parse(input);
    if (!i.fromTransactionId && !i.cardNumber) {
      throw new Error('tokenize: provide fromTransactionId (preferred) or cardNumber');
    }
    if (i.cardNumber) {
      logger.warn('tokenize called with raw cardNumber; prefer fromTransactionId for zero-PCI');
    }
    const body: Record<string, unknown> = {
      ...(i.fromTransactionId && { TranzactionId: i.fromTransactionId }),
      ...(i.cardNumber && { CardNumber: i.cardNumber }),
      ...(i.expiryMonth && { CardExpirationMM: i.expiryMonth }),
      ...(i.expiryYear && { CardExpirationYY: i.expiryYear % 100 }),
      ...(i.cvv && { CVV2: i.cvv }),
      ...(i.customerExternalId && { CustomerExternalId: i.customerExternalId }),
    };
    const res = await this.http.post(PATHS.tokenize, body, { flow: 'tokenize' });
    const r = res as Record<string, unknown>;
    return {
      token: String(r.Token ?? ''),
      cardLast4: r.Last4 as string | undefined,
      cardBrand: r.CardBrand as string | undefined,
      expiry: r.CardExpiration as string | undefined,
      raw: res,
    };
  }

  // ===== Recurring (הוראת קבע) =====
  async createRecurring(input: CreateRecurringInput): Promise<CreateRecurringResult> {
    const i = CreateRecurringInputSchema.parse(input);
    const body: Record<string, unknown> = {
      Token: i.token,
      Amount: i.amount,
      Frequency: i.frequency,
      ...(i.totalCharges && { TotalCharges: i.totalCharges }),
      StartDate: i.startDate,
      CustomerExternalId: i.customerExternalId,
      ProductName: i.productName,
      ...(i.extra ?? {}),
    };
    const res = await this.http.post(PATHS.recurringCreate, body, {
      flow: 'recurring.create',
    });
    const r = res as Record<string, unknown>;
    return { recurringId: String(r.RecurringId ?? ''), raw: res };
  }

  async cancelRecurring(input: CancelRecurringInput): Promise<CancelRecurringResult> {
    const i = CancelRecurringInputSchema.parse(input);
    const res = await this.http.post(
      PATHS.recurringCancel,
      { RecurringId: i.recurringId, ...(i.reason && { Reason: i.reason }) },
      { flow: 'recurring.cancel' }
    );
    return { cancelled: true, raw: res };
  }
}
