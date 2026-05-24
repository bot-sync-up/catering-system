/**
 * Canonical webhook events emitted by our handler.
 * The wire format from Cardcom is normalized into these envelopes before
 * downstream consumers (BullMQ, audit log, billing service) see them.
 */
import { z } from 'zod';
import { randomUUID } from 'crypto';

export const PaymentCapturedSchema = z.object({
  type: z.literal('payment.captured'),
  id: z.string(),
  occurredAt: z.string().datetime(),
  data: z.object({
    tranzactionId: z.number(),
    amount: z.number(),
    currency: z.string(),
    last4: z.string().optional(),
    approvalNumber: z.string().optional(),
    token: z.string().optional(),
    returnValue: z.string().optional(),
  }),
});

export const PaymentFailedSchema = z.object({
  type: z.literal('payment.failed'),
  id: z.string(),
  occurredAt: z.string().datetime(),
  data: z.object({
    tranzactionId: z.number().optional(),
    amount: z.number(),
    currency: z.string(),
    responseCode: z.number(),
    description: z.string().optional(),
    returnValue: z.string().optional(),
  }),
});

export const RefundCompletedSchema = z.object({
  type: z.literal('refund.completed'),
  id: z.string(),
  occurredAt: z.string().datetime(),
  data: z.object({
    tranzactionId: z.number(),
    refundedAmount: z.number(),
    currency: z.string(),
  }),
});

export const ChargebackOpenedSchema = z.object({
  type: z.literal('chargeback.opened'),
  id: z.string(),
  occurredAt: z.string().datetime(),
  data: z.object({
    tranzactionId: z.number(),
    reasonCode: z.string().optional(),
    amount: z.number(),
    currency: z.string(),
  }),
});

export const CanonicalEventSchema = z.discriminatedUnion('type', [
  PaymentCapturedSchema,
  PaymentFailedSchema,
  RefundCompletedSchema,
  ChargebackOpenedSchema,
]);
export type CanonicalEvent = z.infer<typeof CanonicalEventSchema>;

/**
 * Normalize a raw Cardcom payload into a canonical event.
 */
export function normalize(rawType: string, raw: Record<string, unknown>): CanonicalEvent {
  const id = String(raw.EventId ?? raw.id ?? raw.LowProfileId ?? randomUUID());
  const occurredAt = String(raw.EventTime ?? raw.createdAt ?? new Date().toISOString());

  switch (rawType) {
    case 'payment.captured':
    case 'TRANSACTION_APPROVED':
      return PaymentCapturedSchema.parse({
        type: 'payment.captured',
        id,
        occurredAt,
        data: {
          tranzactionId: Number(raw.TranzactionId ?? raw.tranzactionId),
          amount: Number(raw.Amount ?? raw.amount),
          currency: String(raw.Currency ?? raw.currency ?? 'ILS'),
          last4: raw.Last4CardDigits ? String(raw.Last4CardDigits) : undefined,
          approvalNumber: raw.ApprovalNumber ? String(raw.ApprovalNumber) : undefined,
          token: raw.Token ? String(raw.Token) : undefined,
          returnValue: raw.ReturnValue ? String(raw.ReturnValue) : undefined,
        },
      });
    case 'payment.failed':
    case 'TRANSACTION_DECLINED':
      return PaymentFailedSchema.parse({
        type: 'payment.failed',
        id,
        occurredAt,
        data: {
          tranzactionId: raw.TranzactionId ? Number(raw.TranzactionId) : undefined,
          amount: Number(raw.Amount ?? raw.amount ?? 0),
          currency: String(raw.Currency ?? raw.currency ?? 'ILS'),
          responseCode: Number(raw.ResponseCode ?? raw.responseCode ?? 999),
          description: raw.Description ? String(raw.Description) : undefined,
          returnValue: raw.ReturnValue ? String(raw.ReturnValue) : undefined,
        },
      });
    case 'refund.completed':
    case 'REFUND_COMPLETED':
      return RefundCompletedSchema.parse({
        type: 'refund.completed',
        id,
        occurredAt,
        data: {
          tranzactionId: Number(raw.TranzactionId ?? raw.tranzactionId),
          refundedAmount: Number(raw.RefundedAmount ?? raw.refundedAmount),
          currency: String(raw.Currency ?? raw.currency ?? 'ILS'),
        },
      });
    case 'chargeback.opened':
    case 'CHARGEBACK_OPENED':
      return ChargebackOpenedSchema.parse({
        type: 'chargeback.opened',
        id,
        occurredAt,
        data: {
          tranzactionId: Number(raw.TranzactionId ?? raw.tranzactionId),
          reasonCode: raw.ReasonCode ? String(raw.ReasonCode) : undefined,
          amount: Number(raw.Amount ?? raw.amount ?? 0),
          currency: String(raw.Currency ?? raw.currency ?? 'ILS'),
        },
      });
    default:
      throw new Error(`Unknown webhook event type: ${rawType}`);
  }
}
