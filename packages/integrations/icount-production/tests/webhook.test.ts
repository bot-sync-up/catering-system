/**
 * tests/webhook.test.ts — אימות חתימה ועיבוד webhooks
 */

import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'crypto';
import { WebhookReceiver, WebhookSignatureError } from '../src/webhooks/receiver';

const SECRET = 'super-secret-key';

function sign(rawBody: string, ts: string): string {
  return createHmac('sha256', SECRET).update(`${ts}.${rawBody}`).digest('hex');
}

describe('WebhookReceiver', () => {
  it('מאמת חתימה תקינה', async () => {
    const rec = new WebhookReceiver({ secret: SECRET });
    const ts = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({
      id: 'evt_1',
      type: 'invoice.created',
      cid: 'C1',
      timestamp: new Date().toISOString(),
      signature: 'irrelevant',
      data: { doc_id: 100 },
    });
    const sig = sign(body, ts);

    const event = await rec.process(body, {
      'x-icount-signature': sig,
      'x-icount-timestamp': ts,
    });
    expect(event.id).toBe('evt_1');
  });

  it('דוחה חתימה לא תקינה', async () => {
    const rec = new WebhookReceiver({ secret: SECRET });
    const ts = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({
      id: 'evt_2',
      type: 'invoice.created',
      cid: 'C1',
      timestamp: new Date().toISOString(),
      signature: 'x',
      data: {},
    });

    await expect(
      rec.process(body, {
        'x-icount-signature': 'BADSIG',
        'x-icount-timestamp': ts,
      }),
    ).rejects.toThrow(WebhookSignatureError);
  });

  it('דוחה timestamp ישן (replay)', async () => {
    const rec = new WebhookReceiver({ secret: SECRET, toleranceSeconds: 60 });
    const oldTs = String(Math.floor(Date.now() / 1000) - 3600);
    const body = JSON.stringify({
      id: 'evt_3', type: 'invoice.paid', cid: 'C1',
      timestamp: new Date().toISOString(), signature: '', data: {},
    });
    const sig = sign(body, oldTs);
    await expect(
      rec.process(body, { 'x-icount-signature': sig, 'x-icount-timestamp': oldTs }),
    ).rejects.toThrow(WebhookSignatureError);
  });

  it('מפעיל handlers מתאימים', async () => {
    const rec = new WebhookReceiver({ secret: SECRET });
    const handler = vi.fn();
    const star = vi.fn();
    rec.on('invoice.created', handler);
    rec.on('*', star);

    const ts = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({
      id: 'evt_4', type: 'invoice.created', cid: 'C1',
      timestamp: new Date().toISOString(), signature: '', data: { doc_id: 1 },
    });
    await rec.process(body, {
      'x-icount-signature': sign(body, ts),
      'x-icount-timestamp': ts,
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(star).toHaveBeenCalledTimes(1);
  });
});
