import { createHmac } from 'crypto';

import { WebhookReceiver } from '../../src/webhooks/receiver';
import { WebhookEventType } from '../../src/types';

describe('WebhookReceiver', () => {
  const secret = 'super-secret';
  let receiver: WebhookReceiver;

  beforeEach(() => {
    receiver = new WebhookReceiver({ secret, toleranceSeconds: 600 });
  });

  function sign(body: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
  }

  it('verifies a correct signature', () => {
    const body = JSON.stringify({ event: 'invoice.created' });
    expect(receiver.verifySignature(body, sign(body))).toBe(true);
  });

  it('rejects an incorrect signature', () => {
    const body = JSON.stringify({ event: 'invoice.created' });
    expect(receiver.verifySignature(body, 'deadbeef')).toBe(false);
  });

  it('rejects empty signature', () => {
    expect(receiver.verifySignature('{}', '')).toBe(false);
  });

  it('routes event to registered handler', async () => {
    const payload = {
      id: 'evt_1',
      event: WebhookEventType.INVOICE_CREATED,
      timestamp: new Date().toISOString(),
      signature: 'sig',
      data: { documentId: 'doc_1' },
    };
    const body = JSON.stringify(payload);

    let called = false;
    receiver.on(WebhookEventType.INVOICE_CREATED, () => {
      called = true;
    });

    const res = await receiver.handle(body, sign(body));
    expect(res.ok).toBe(true);
    expect(called).toBe(true);
  });

  it('rejects when timestamp out of tolerance', async () => {
    const payload = {
      id: 'evt_1',
      event: WebhookEventType.INVOICE_CREATED,
      timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      signature: 'sig',
      data: {},
    };
    const body = JSON.stringify(payload);
    await expect(receiver.handle(body, sign(body))).rejects.toThrow('timestamp');
  });

  it('rejects invalid JSON', async () => {
    const body = 'not json';
    await expect(receiver.handle(body, sign(body))).rejects.toThrow('Invalid JSON');
  });

  it('throws when secret is missing', () => {
    expect(() => new WebhookReceiver({ secret: '' })).toThrow();
  });
});
