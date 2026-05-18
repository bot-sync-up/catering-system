import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { CardcomClient } from '../src/CardcomClient';
import {
  IdempotencyConflictError,
  MemoryIdempotencyStore,
  hashRequest,
  runIdempotent,
} from '../src/idempotency';

const BASE = 'https://sandbox.cardcom.solutions';
const PATH = '/api/v11';

describe('idempotency primitives', () => {
  it('hashRequest is stable across key ordering', () => {
    expect(hashRequest({ a: 1, b: 2 })).toBe(hashRequest({ b: 2, a: 1 }));
  });

  it('returns cached result for identical body + key', async () => {
    const store = new MemoryIdempotencyStore();
    let calls = 0;
    const out1 = await runIdempotent(store, 'k1', { a: 1 }, async () => {
      calls++;
      return { ok: true, n: 1 };
    });
    const out2 = await runIdempotent(store, 'k1', { a: 1 }, async () => {
      calls++;
      return { ok: true, n: 99 };
    });
    expect(calls).toBe(1);
    expect(out1).toEqual({ ok: true, n: 1 });
    expect(out2).toEqual({ ok: true, n: 1 });
  });

  it('throws conflict on same key with different body', async () => {
    const store = new MemoryIdempotencyStore();
    await runIdempotent(store, 'k1', { a: 1 }, async () => 'first');
    await expect(
      runIdempotent(store, 'k1', { a: 2 }, async () => 'second'),
    ).rejects.toBeInstanceOf(IdempotencyConflictError);
  });

  it('persists failure and re-throws on subsequent identical call', async () => {
    const store = new MemoryIdempotencyStore();
    await expect(
      runIdempotent(store, 'k1', { a: 1 }, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await expect(
      runIdempotent(store, 'k1', { a: 1 }, async () => 'never'),
    ).rejects.toThrow('boom');
  });
});

describe('CardcomClient charge idempotency', () => {
  beforeEach(() => {
    nock.cleanAll();
    nock.disableNetConnect();
  });
  afterEach(() => nock.enableNetConnect());

  it('only calls upstream once for repeated charge with same idempotencyKey', async () => {
    const scope = nock(BASE)
      .post(`${PATH}/Transactions/Transaction`)
      .reply(200, {
        ResponseCode: 0,
        TranzactionId: 1234,
        Amount: 10,
      });

    const client = new CardcomClient({
      credentials: { terminalNumber: '1000', apiName: 'unit', apiPassword: 'pw' },
      environment: 'sandbox',
      retry: { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0, random: () => 0 },
    });

    const input = {
      amount: 10,
      currency: 'ILS' as const,
      token: 'tok_abcd1234',
      productName: 'X',
      idempotencyKey: 'ick_test_001',
    };

    const a = await client.charge(input);
    const b = await client.charge(input);

    expect(a.TranzactionId).toBe(1234);
    expect(b.TranzactionId).toBe(1234);
    expect(scope.isDone()).toBe(true); // upstream called exactly once
  });

  it('sends Idempotency-Key header', async () => {
    nock(BASE)
      .matchHeader('Idempotency-Key', 'ick_explicit_key')
      .post(`${PATH}/Transactions/Transaction`)
      .reply(200, {
        ResponseCode: 0,
        TranzactionId: 1,
        Amount: 10,
      });

    const client = new CardcomClient({
      credentials: { terminalNumber: '1000', apiName: 'unit', apiPassword: 'pw' },
      environment: 'sandbox',
      retry: { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0, random: () => 0 },
    });

    const out = await client.charge({
      amount: 10,
      currency: 'ILS',
      token: 'tok_abcd1234',
      productName: 'X',
      idempotencyKey: 'ick_explicit_key',
    });
    expect(out.TranzactionId).toBe(1);
  });
});
