/**
 * Cardcom Production SDK — Type Definitions
 * Zod schemas for runtime validation + TypeScript types.
 * SECURITY: TokenizeInputSchema accepts ONLY a token. PAN/CVV must NEVER be
 * forwarded through our backend (zero-PCI scope).
 */
import { z } from 'zod';

// ============================================================================
// Common primitives
// ============================================================================

export const CurrencySchema = z.enum(['ILS', 'USD', 'EUR', 'GBP']);
export type Currency = z.infer<typeof CurrencySchema>;

export const LanguageSchema = z.enum(['he', 'en', 'ru', 'ar', 'fr', 'es']);
export type Language = z.infer<typeof LanguageSchema>;

export const AmountSchema = z
  .number()
  .positive('Amount must be positive')
  .max(1_000_000, 'Amount exceeds maximum')
  .refine((n) => Math.round(n * 100) / 100 === n, 'Amount must have at most 2 decimals');

export const TokenSchema = z
  .string()
  .min(8, 'Token too short')
  .max(128, 'Token too long')
  .regex(/^[A-Za-z0-9_\-]+$/, 'Token must be URL-safe');

export const NumOfPaymentsSchema = z.number().int().min(1).max(36);

// ============================================================================
// Cardcom credentials & environment
// ============================================================================

export const CardcomCredentialsSchema = z.object({
  terminalNumber: z.string().min(1),
  apiName: z.string().min(1),
  apiPassword: z.string().min(1).optional(),
});
export type CardcomCredentials = z.infer<typeof CardcomCredentialsSchema>;

export const EnvironmentSchema = z.enum(['production', 'sandbox']);
export type Environment = z.infer<typeof EnvironmentSchema>;

// ============================================================================
// LowProfile (iframe / hosted page)
// ============================================================================

export const LowProfileOperationSchema = z.enum([
  'ChargeOnly',
  'ChargeAndCreateToken',
  'CreateTokenOnly',
  'SuspendedDeal',
]);

export const LowProfileCreateInputSchema = z.object({
  amount: AmountSchema,
  currency: CurrencySchema.default('ILS'),
  successUrl: z.string().url(),
  failedUrl: z.string().url(),
  webHookUrl: z.string().url().optional(),
  productName: z.string().min(1).max(200),
  operation: LowProfileOperationSchema.default('ChargeOnly'),
  language: LanguageSchema.default('he'),
  returnValue: z.string().max(50).optional(),
  numOfPayments: NumOfPaymentsSchema.optional(),
  invoiceFullName: z.string().max(100).optional(),
  invoiceEmail: z.string().email().optional(),
  invoicePhone: z.string().max(30).optional(),
});
export type LowProfileCreateInput = z.infer<typeof LowProfileCreateInputSchema>;

export const LowProfileCreateResponseSchema = z.object({
  ResponseCode: z.number(),
  Description: z.string().optional(),
  LowProfileId: z.string(),
  Url: z.string().url(),
});
export type LowProfileCreateResponse = z.infer<typeof LowProfileCreateResponseSchema>;

/**
 * LowProfile result codes from iframe:
 *   0   = Success
 *   9XX = Various failure codes (declined, 3DS failed, timeout, etc.)
 */
export const LowProfileResultSchema = z.object({
  ResponseCode: z.number(),
  Description: z.string().optional(),
  LowProfileId: z.string(),
  TranzactionId: z.number().optional(),
  ReturnValue: z.string().optional(),
  Operation: LowProfileOperationSchema.optional(),
  UIValues: z
    .object({
      CardOwnerName: z.string().optional(),
      CardOwnerEmail: z.string().optional(),
      CardOwnerPhone: z.string().optional(),
      NumOfPayments: z.number().optional(),
    })
    .optional(),
  TranzactionInfo: z
    .object({
      ResponseCode: z.number(),
      Amount: z.number(),
      CoinId: z.number().optional(),
      ApprovalNumber: z.string().optional(),
      Last4CardDigits: z.string().optional(),
      CardMonth: z.number().optional(),
      CardYear: z.number().optional(),
      Token: TokenSchema.optional(),
    })
    .optional(),
});
export type LowProfileResult = z.infer<typeof LowProfileResultSchema>;

// ============================================================================
// Direct charge (token-based, zero-PCI)
// ============================================================================

export const ChargeInputSchema = z.object({
  amount: AmountSchema,
  currency: CurrencySchema.default('ILS'),
  token: TokenSchema,
  cardExpiry: z
    .object({
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2024).max(2099),
    })
    .optional(),
  numOfPayments: NumOfPaymentsSchema.optional(),
  productName: z.string().min(1).max(200),
  externalUniqTranId: z.string().max(80).optional(),
  idempotencyKey: z.string().min(8).max(128).optional(),
  returnValue: z.string().max(50).optional(),
});
export type ChargeInput = z.infer<typeof ChargeInputSchema>;

export const ChargeResponseSchema = z.object({
  ResponseCode: z.number(),
  Description: z.string().optional(),
  TranzactionId: z.number(),
  ApprovalNumber: z.string().optional(),
  Amount: z.number(),
  CoinId: z.number().optional(),
  Last4CardDigits: z.string().optional(),
  Token: TokenSchema.optional(),
});
export type ChargeResponse = z.infer<typeof ChargeResponseSchema>;

// ============================================================================
// Refund
// ============================================================================

export const RefundInputSchema = z.object({
  tranzactionId: z.number().int().positive(),
  partialSum: AmountSchema.optional(),
  externalUniqTranId: z.string().max(80).optional(),
});
export type RefundInput = z.infer<typeof RefundInputSchema>;

export const RefundResponseSchema = z.object({
  ResponseCode: z.number(),
  Description: z.string().optional(),
  TranzactionId: z.number(),
  RefundedAmount: z.number(),
});
export type RefundResponse = z.infer<typeof RefundResponseSchema>;

// ============================================================================
// Tokenize — ZERO-PCI: ONLY token allowed as input.
// Real PAN+CVV ingestion happens on Cardcom hosted pages (LowProfile).
// ============================================================================

export const TokenizeInputSchema = z.object({
  token: TokenSchema,
  cardExpiry: z
    .object({
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2024).max(2099),
    })
    .optional(),
  cardOwnerName: z.string().min(1).max(100).optional(),
  cardOwnerId: z.string().max(20).optional(),
});
export type TokenizeInput = z.infer<typeof TokenizeInputSchema>;

export const TokenizeResponseSchema = z.object({
  ResponseCode: z.number(),
  Description: z.string().optional(),
  Token: TokenSchema,
  Last4CardDigits: z.string().optional(),
  CardMonth: z.number().optional(),
  CardYear: z.number().optional(),
});
export type TokenizeResponse = z.infer<typeof TokenizeResponseSchema>;

// ============================================================================
// Recurring
// ============================================================================

export const RecurringIntervalSchema = z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);

export const CreateRecurringInputSchema = z.object({
  token: TokenSchema,
  amount: AmountSchema,
  currency: CurrencySchema.default('ILS'),
  productName: z.string().min(1).max(200),
  interval: RecurringIntervalSchema.default('MONTHLY'),
  startAt: z.coerce.date(),
  totalPayments: z.number().int().min(1).max(120).optional(),
  customerEmail: z.string().email().optional(),
});
export type CreateRecurringInput = z.infer<typeof CreateRecurringInputSchema>;

export const RecurringResponseSchema = z.object({
  ResponseCode: z.number(),
  Description: z.string().optional(),
  RecurringId: z.string(),
});
export type RecurringResponse = z.infer<typeof RecurringResponseSchema>;

export const CancelRecurringInputSchema = z.object({
  recurringId: z.string().min(1),
  reason: z.string().max(200).optional(),
});
export type CancelRecurringInput = z.infer<typeof CancelRecurringInputSchema>;

// ============================================================================
// 3DS — PA Authorization
// ============================================================================

export const ThreeDsRequestSchema = z.object({
  amount: AmountSchema,
  currency: CurrencySchema,
  token: TokenSchema,
  returnUrl: z.string().url(),
  numOfPayments: NumOfPaymentsSchema.optional(),
  productName: z.string().min(1).max(200),
});
export type ThreeDsRequest = z.infer<typeof ThreeDsRequestSchema>;

export const ThreeDsChallengeResponseSchema = z.object({
  ResponseCode: z.number(),
  Description: z.string().optional(),
  ChallengeRequired: z.boolean(),
  RedirectUrl: z.string().url().optional(),
  ThreeDsSessionId: z.string().optional(),
  AuthorizationData: z
    .object({
      eci: z.string().optional(),
      cavv: z.string().optional(),
      xid: z.string().optional(),
      dsTransId: z.string().optional(),
    })
    .optional(),
});
export type ThreeDsChallengeResponse = z.infer<typeof ThreeDsChallengeResponseSchema>;

export const ThreeDsCompleteInputSchema = z.object({
  threeDsSessionId: z.string().min(1),
  paRes: z.string().optional(),
  cres: z.string().optional(),
});
export type ThreeDsCompleteInput = z.infer<typeof ThreeDsCompleteInputSchema>;

// ============================================================================
// Webhook events (canonical)
// ============================================================================

export const WebhookEventTypeSchema = z.enum([
  'payment.captured',
  'payment.failed',
  'refund.completed',
  'chargeback.opened',
  'recurring.charged',
  'recurring.failed',
  'token.created',
  'token.revoked',
]);
export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;

export const WebhookEnvelopeSchema = z.object({
  id: z.string().min(8),
  type: WebhookEventTypeSchema,
  createdAt: z.string().datetime(),
  nonce: z.string().min(8),
  data: z.record(z.unknown()),
});
export type WebhookEnvelope = z.infer<typeof WebhookEnvelopeSchema>;
