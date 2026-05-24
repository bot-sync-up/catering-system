import { WebhookPayload, WebhookPayloadSchema } from '../types';
import { verifySignature } from '../utils/signature';
import { logger } from '../utils/logger';
import { IntegrationLogRepo } from '../db/IntegrationLogRepo';
import { ChargebackRepo } from '../db/ChargebackRepo';

export interface AlertSink {
  send(opts: { level: 'info' | 'warn' | 'error'; message: string; meta?: unknown }): Promise<void>;
}

export interface WebhookDeps {
  secret: string;
  logs: IntegrationLogRepo;
  chargebacks: ChargebackRepo;
  alerts: AlertSink;
}

function rawCardComToCanonical(raw: Record<string, unknown>): WebhookPayload {
  // CardCom uses different field names depending on event;
  // map a few canonical types here.
  const op = String(raw.Operation ?? raw.OperationType ?? '').toLowerCase();
  const responseCode = String(raw.ResponseCode ?? '0');
  let type: WebhookPayload['type'] = 'charge.success';

  if (op.includes('chargeback') || raw.ChargebackId) type = 'chargeback.opened';
  else if (op.includes('refund')) type = 'refund.completed';
  else if (op.includes('token') && responseCode === '0') type = 'token.created';
  else if (op.includes('recurring') && responseCode === '0') type = 'recurring.charged';
  else if (op.includes('recurring')) type = 'recurring.failed';
  else if (responseCode !== '0') type = 'charge.failed';

  return WebhookPayloadSchema.parse({
    type,
    transactionId: raw.TranzactionId
      ? String(raw.TranzactionId)
      : raw.TransactionId
        ? String(raw.TransactionId)
        : undefined,
    recurringId: raw.RecurringId ? String(raw.RecurringId) : undefined,
    amount: typeof raw.Amount === 'number' ? raw.Amount : undefined,
    reason: typeof raw.Description === 'string' ? raw.Description : undefined,
    raw,
  });
}

export async function handleWebhook(
  deps: WebhookDeps,
  body: Record<string, unknown>,
  signatureHeader: string | undefined,
  rawBodyStr: string
): Promise<{ ok: boolean; event: WebhookPayload['type'] }> {
  if (!signatureHeader || !verifySignature(deps.secret, rawBodyStr, signatureHeader)) {
    logger.warn('webhook: invalid signature');
    throw new Error('invalid_signature');
  }
  const evt = rawCardComToCanonical(body);
  await deps.logs.write({
    createdAt: new Date(),
    flow: `webhook.${evt.type}`,
    request: body,
    success: true,
    attempt: 1,
    durationMs: 0,
  });

  if (evt.type === 'chargeback.opened') {
    await deps.chargebacks.recordOpened({
      transactionId: evt.transactionId ?? '',
      amount: evt.amount ?? 0,
      reason: evt.reason ?? '',
      receivedAt: new Date(),
      raw: body,
    });
    await deps.alerts.send({
      level: 'error',
      message: `Chargeback opened on tx ${evt.transactionId} amount ${evt.amount}`,
      meta: body,
    });
  } else if (evt.type === 'chargeback.resolved') {
    await deps.chargebacks.recordResolved({
      transactionId: evt.transactionId ?? '',
      resolvedAt: new Date(),
      raw: body,
    });
  } else if (evt.type === 'recurring.failed' || evt.type === 'charge.failed') {
    await deps.alerts.send({
      level: 'warn',
      message: `${evt.type} on tx ${evt.transactionId ?? evt.recurringId}`,
      meta: body,
    });
  }
  return { ok: true, event: evt.type };
}
