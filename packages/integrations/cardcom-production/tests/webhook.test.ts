import { describe, it, expect } from 'vitest';
import {
  CardcomWebhookHandler,
  MemoryNonceStore,
  computeSignature,
} from '../src/webhooks/handler';
import { CardcomWebhookError } from '../src/errors';

const SECRET = 'test-signing-secret-1234567890';

function makeEnvelope(eventType: string, body: Record<string, unknown>, now = Math.floor(Date.now() / 1000)) {
  const rawBody = JSON.stringify(body);
  const timestamp = String(now);
  const nonce = `n-${Math.random().toString(36).slice(2, 12)}`;
  const signature = computeSignature(rawBody, timestamp, nonce, SECRET);
  return { rawBody, signature, timestamp, nonce, eventType };
}

describe('CardcomWebhookHandler', () => {
  it('verifies a well-formed payment.captured event', async () => {
    const handler = new CardcomWebhookHandler({
      signingSecret: SECRET,
      nonceStore: new MemoryNonceStore(),
    });
    const env = makeEnvelope('payment.captured', {
      TranzactionId: 42,
      Amount: 99.9,
      Currency: 'ILS',
      Last4CardDigits: '4242',
      ApprovalNumber: '123',
    });
    const evt = await handler.verifyAndParse(env);
    expect(evt.type).toBe('payment.captured');
    if (evt.type === 'payment.captured') {
      expect(evt.data.tranzactionId).toBe(42);
      expect(evt.data.amount).toBe(99.9);
    }
  });

  it('rejects tampered body (signature mismatch)', async () => {
    const handler = new CardcomWebhookHandler({
      signingSecret: SECRET,
      nonceStore: new MemoryNonceStore(),
    });
    const env = makeEnvelope('payment.captured', {
      TranzactionId: 42,
      Amount: 99.9,
      Currency: 'ILS',
    });
    env.rawBody = JSON.stringify({ TranzactionId: 42, Amount: 9999.9, Currency: 'ILS' });
    await expect(handler.verifyAndParse(env)).rejects.toThrow(CardcomWebhookError);
  });

  it('rejects timestamp outside replay window', async () => {
    const handler = new CardcomWebhookHandler({
      signingSecret: SECRET,
      nonceStore: new MemoryNonceStore(),
      replayWindowSec: 60,
    });
    const env = makeEnvelope(
      'payment.captured',
      { TranzactionId: 1, Amount: 1, Currency: 'ILS' },
      Math.floor(Date.now() / 1000) - 3600,
    );
    await expect(handler.verifyAndParse(env)).rejects.toThrow(/replay window/i);
  });

  it('rejects replay (nonce already seen)', async () => {
    const store = new MemoryNonceStore();
    const handler = new CardcomWebhookHandler({ signingSecret: SECRET, nonceStore: store });
    const env = makeEnvelope('payment.captured', {
      TranzactionId: 1,
      Amount: 1,
      Currency: 'ILS',
    });
    await handler.verifyAndParse(env);
    await expect(handler.verifyAndParse(env)).rejects.toThrow(/Replay/i);
  });

  it('normalizes refund.completed and chargeback.opened', async () => {
    const handler = new CardcomWebhookHandler({
      signingSecret: SECRET,
      nonceStore: new MemoryNonceStore(),
    });

    const refund = makeEnvelope('refund.completed', {
      TranzactionId: 7,
      RefundedAmount: 30,
      Currency: 'ILS',
    });
    const refundEvt = await handler.verifyAndParse(refund);
    expect(refundEvt.type).toBe('refund.completed');

    const cb = makeEnvelope('chargeback.opened', {
      TranzactionId: 9,
      ReasonCode: '4855',
      Amount: 88,
      Currency: 'ILS',
    });
    const cbEvt = await handler.verifyAndParse(cb);
    expect(cbEvt.type).toBe('chargeback.opened');
  });

  it('rejects missing headers', async () => {
    const handler = new CardcomWebhookHandler({
      signingSecret: SECRET,
      nonceStore: new MemoryNonceStore(),
    });
    await expect(
      handler.verifyAndParse({
        rawBody: '{}',
        signature: '',
        timestamp: '',
        nonce: '',
        eventType: '',
      }),
    ).rejects.toThrow(/Missing/);
  });

  it('rejects unknown event type', async () => {
    const handler = new CardcomWebhookHandler({
      signingSecret: SECRET,
      nonceStore: new MemoryNonceStore(),
    });
    const env = makeEnvelope('not.a.real.event', { foo: 'bar' });
    await expect(handler.verifyAndParse(env)).rejects.toThrow(/Unknown webhook event/);
  });

  it('refuses short signing secrets', () => {
    expect(
      () =>
        new CardcomWebhookHandler({
          signingSecret: 'short',
          nonceStore: new MemoryNonceStore(),
        }),
    ).toThrow();
  });
});
