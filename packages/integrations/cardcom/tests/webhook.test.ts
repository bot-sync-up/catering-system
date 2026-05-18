import { describe, it, expect, vi } from 'vitest';
import { handleWebhook } from '../src/webhooks/handler';
import { computeSignature } from '../src/utils/signature';

function deps() {
  return {
    secret: 'shh',
    logs: { write: vi.fn().mockResolvedValue(1) } as never,
    chargebacks: {
      recordOpened: vi.fn().mockResolvedValue(undefined),
      recordResolved: vi.fn().mockResolvedValue(undefined),
    } as never,
    alerts: { send: vi.fn().mockResolvedValue(undefined) },
  };
}

describe('webhook handler', () => {
  it('rejects bad signature', async () => {
    const d = deps();
    await expect(
      handleWebhook(d, { foo: 1 }, 'badsig', JSON.stringify({ foo: 1 }))
    ).rejects.toThrow('invalid_signature');
  });

  it('chargeback opened -> alert + DB', async () => {
    const d = deps();
    const body = {
      Operation: 'Chargeback',
      TranzactionId: 'tx_1',
      Amount: 50,
      Description: 'fraud',
    };
    const raw = JSON.stringify(body);
    const sig = computeSignature(d.secret, raw);
    const r = await handleWebhook(d, body, sig, raw);
    expect(r.event).toBe('chargeback.opened');
    expect((d.chargebacks as never as { recordOpened: { mock: { calls: unknown[] } } }).recordOpened.mock.calls.length).toBe(1);
    expect((d.alerts.send as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('successful charge logs but does not alert', async () => {
    const d = deps();
    const body = { ResponseCode: 0, TranzactionId: 'tx_2', Amount: 10 };
    const raw = JSON.stringify(body);
    const sig = computeSignature(d.secret, raw);
    const r = await handleWebhook(d, body, sig, raw);
    expect(r.event).toBe('charge.success');
    expect((d.alerts.send as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });
});
