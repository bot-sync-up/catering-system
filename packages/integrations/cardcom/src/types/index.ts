import { z } from 'zod';

// ===== Core config =====
export const CardComConfigSchema = z.object({
  terminal: z.number().int().positive(),
  username: z.string().min(1),
  apiName: z.string().min(1),
  apiPassword: z.string().optional(),
  baseUrl: z.string().url().default('https://secure.cardcom.solutions'),
  timeoutMs: z.number().int().positive().default(30_000),
});
export type CardComConfig = z.infer<typeof CardComConfigSchema>;

// ===== Payment methods =====
export const PaymentMethod = z.enum([
  'credit',
  'bit',
  'google_pay',
  'apple_pay',
  'token',
]);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

// ===== LowProfile (iframe, zero-PCI) =====
export const LowProfileOperation = z.enum([
  'ChargeOnly',
  'ChargeAndCreateToken',
  'CreateTokenOnly',
  'SuspendedDeal',
]);
export type LowProfileOperation = z.infer<typeof LowProfileOperation>;

export const CreateLowProfileInputSchema = z.object({
  amount: z.number().positive(),
  numOfPayments: z.number().int().min(1).max(12).default(1),
  productName: z.string().min(1),
  language: z.enum(['he', 'en', 'ar', 'ru']).default('he'),
  isoCoinId: z.number().int().default(1), // 1 = ILS
  successUrl: z.string().url(),
  failedUrl: z.string().url(),
  webhookUrl: z.string().url().optional(),
  operation: LowProfileOperation.default('ChargeOnly'),
  // Wallets / alt payments
  enableBit: z.boolean().default(false),
  enableGooglePay: z.boolean().default(false),
  enableApplePay: z.boolean().default(false),
  // Optional pass-through
  customer: z
    .object({
      fullName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      idNumber: z.string().optional(),
    })
    .optional(),
  // Extra arbitrary fields (admin can edit any param)
  extra: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type CreateLowProfileInput = z.infer<typeof CreateLowProfileInputSchema>;

export interface CreateLowProfileResult {
  lowProfileId: string;
  url: string; // iframe src
  raw: unknown;
}

// ===== Direct charge =====
export const ChargeInputSchema = z.object({
  amount: z.number().positive(),
  numOfPayments: z.number().int().min(1).max(12).default(1),
  // Either token OR raw card; client should always prefer token
  token: z.string().optional(),
  cardOwner: z
    .object({
      fullName: z.string().optional(),
      idNumber: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  productName: z.string().optional(),
  isoCoinId: z.number().int().default(1),
  documentToCreate: z
    .enum(['Receipt', 'TaxInvoice', 'TaxInvoiceAndReceipt', 'None'])
    .default('None'),
  extra: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type ChargeInput = z.infer<typeof ChargeInputSchema>;

export interface ChargeResult {
  transactionId: string;
  approvalNumber?: string;
  amount: number;
  raw: unknown;
}

// ===== Refund =====
export const RefundInputSchema = z.object({
  transactionId: z.string().min(1),
  amount: z.number().positive().optional(), // partial refund supported
  reason: z.string().optional(),
});
export type RefundInput = z.infer<typeof RefundInputSchema>;

export interface RefundResult {
  refundTransactionId: string;
  raw: unknown;
}

// ===== Tokenize =====
export const TokenizeInputSchema = z.object({
  cardNumber: z.string().min(12).max(19).optional(),
  expiryMonth: z.number().int().min(1).max(12).optional(),
  expiryYear: z.number().int().min(2024).max(2099).optional(),
  cvv: z.string().min(3).max(4).optional(),
  // Or use a previous transaction id to tokenize
  fromTransactionId: z.string().optional(),
  customerExternalId: z.string().optional(),
});
export type TokenizeInput = z.infer<typeof TokenizeInputSchema>;

export interface TokenizeResult {
  token: string;
  cardLast4?: string;
  cardBrand?: string;
  expiry?: string;
  raw: unknown;
}

// ===== Recurring =====
export const RecurringFrequency = z.enum(['monthly', 'quarterly', 'yearly']);
export type RecurringFrequency = z.infer<typeof RecurringFrequency>;

export const CreateRecurringInputSchema = z.object({
  token: z.string().min(1),
  amount: z.number().positive(),
  frequency: RecurringFrequency,
  totalCharges: z.number().int().min(1).optional(), // omit = open-ended
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customerExternalId: z.string().min(1),
  productName: z.string().min(1),
  extra: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type CreateRecurringInput = z.infer<typeof CreateRecurringInputSchema>;

export interface CreateRecurringResult {
  recurringId: string;
  raw: unknown;
}

export const CancelRecurringInputSchema = z.object({
  recurringId: z.string().min(1),
  reason: z.string().optional(),
});
export type CancelRecurringInput = z.infer<typeof CancelRecurringInputSchema>;

export interface CancelRecurringResult {
  cancelled: boolean;
  raw: unknown;
}

// ===== Split payments =====
export const SplitPartySchema = z.object({
  partyExternalId: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional(),
});
export type SplitParty = z.infer<typeof SplitPartySchema>;

export const SplitChargeInputSchema = ChargeInputSchema.extend({
  parties: z.array(SplitPartySchema).min(2),
});
export type SplitChargeInput = z.infer<typeof SplitChargeInputSchema>;

// ===== Milestones (deposit -> intermediate -> final) =====
export const MilestoneStage = z.enum(['deposit', 'intermediate', 'final']);
export type MilestoneStage = z.infer<typeof MilestoneStage>;

export const MilestonePlanInputSchema = z.object({
  totalAmount: z.number().positive(),
  customerExternalId: z.string().min(1),
  productName: z.string().min(1),
  deposit: z.object({ amount: z.number().positive(), dueDate: z.string() }),
  intermediates: z
    .array(z.object({ amount: z.number().positive(), dueDate: z.string() }))
    .default([]),
  final: z.object({ amount: z.number().positive(), dueDate: z.string() }),
});
export type MilestonePlanInput = z.infer<typeof MilestonePlanInputSchema>;

// ===== Webhook (incl. chargeback) =====
export const WebhookEventType = z.enum([
  'charge.success',
  'charge.failed',
  'token.created',
  'recurring.charged',
  'recurring.failed',
  'chargeback.opened',
  'chargeback.resolved',
  'refund.completed',
]);
export type WebhookEventType = z.infer<typeof WebhookEventType>;

export const WebhookPayloadSchema = z.object({
  type: WebhookEventType,
  transactionId: z.string().optional(),
  recurringId: z.string().optional(),
  amount: z.number().optional(),
  reason: z.string().optional(),
  raw: z.record(z.string(), z.unknown()),
});
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

// ===== Integration log =====
export interface IntegrationLogRecord {
  id?: number;
  createdAt: Date;
  flow: string;
  request: unknown;
  response?: unknown;
  errorMessage?: string;
  httpStatus?: number;
  attempt: number;
  success: boolean;
  durationMs: number;
}
