import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { CardcomClient } from '../src/CardcomClient';
import { CardcomThreeDsError } from '../src/errors';

const BASE = 'https://sandbox.cardcom.solutions';
const PATH = '/api/v11';

function makeClient() {
  return new CardcomClient({
    credentials: { terminalNumber: '1000', apiName: 'unit', apiPassword: 'pw' },
    environment: 'sandbox',
    retry: { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0, random: () => 0 },
  });
}

describe('3DS flow', () => {
  beforeEach(() => {
    nock.cleanAll();
    nock.disableNetConnect();
  });
  afterEach(() => nock.enableNetConnect());

  it('returns frictionless auth data when ChallengeRequired=false', async () => {
    nock(BASE)
      .post(`${PATH}/Transactions/3DS/Authorize`)
      .reply(200, {
        ResponseCode: 0,
        ChallengeRequired: false,
        ThreeDsSessionId: '3ds_s1',
        AuthorizationData: { eci: '05', cavv: 'cavv1', xid: 'xid1' },
      });

    const client = makeClient();
    const res = await client.authorize3ds({
      amount: 100,
      currency: 'ILS',
      token: 'tok_abcd1234',
      returnUrl: 'https://app.example/3ds-return',
      productName: 'Test',
    });
    expect(res.ChallengeRequired).toBe(false);
    expect(res.AuthorizationData?.cavv).toBe('cavv1');
  });

  it('returns redirect URL when challenge required', async () => {
    nock(BASE)
      .post(`${PATH}/Transactions/3DS/Authorize`)
      .reply(200, {
        ResponseCode: 0,
        ChallengeRequired: true,
        RedirectUrl: 'https://acs.example/challenge?id=abc',
        ThreeDsSessionId: '3ds_s2',
      });

    const client = makeClient();
    const res = await client.authorize3ds({
      amount: 100,
      currency: 'ILS',
      token: 'tok_abcd1234',
      returnUrl: 'https://app.example/3ds-return',
      productName: 'Test',
    });
    expect(res.ChallengeRequired).toBe(true);
    expect(res.RedirectUrl).toMatch(/acs.example/);
  });

  it('retries once on transient 902 then succeeds', async () => {
    nock(BASE)
      .post(`${PATH}/Transactions/3DS/Authorize`)
      .reply(503, { ResponseCode: 902, ChallengeRequired: false })
      .post(`${PATH}/Transactions/3DS/Authorize`)
      .reply(200, {
        ResponseCode: 0,
        ChallengeRequired: false,
        ThreeDsSessionId: '3ds_s3',
        AuthorizationData: { eci: '05' },
      });

    const client = makeClient();
    const res = await client.authorize3ds({
      amount: 100,
      currency: 'ILS',
      token: 'tok_abcd1234',
      returnUrl: 'https://app.example/3ds-return',
      productName: 'Test',
    });
    expect(res.ThreeDsSessionId).toBe('3ds_s3');
  });

  it('throws CardcomThreeDsError on non-retryable failure', async () => {
    nock(BASE)
      .post(`${PATH}/Transactions/3DS/Authorize`)
      .reply(200, {
        ResponseCode: 4,
        Description: 'Not enrolled',
        ChallengeRequired: false,
      });

    const client = makeClient();
    await expect(
      client.authorize3ds({
        amount: 100,
        currency: 'ILS',
        token: 'tok_abcd1234',
        returnUrl: 'https://app.example/3ds-return',
        productName: 'Test',
      }),
    ).rejects.toThrow(CardcomThreeDsError);
  });

  it('complete returns final authorization data', async () => {
    nock(BASE)
      .post(`${PATH}/Transactions/3DS/Complete`)
      .reply(200, {
        ResponseCode: 0,
        ChallengeRequired: false,
        ThreeDsSessionId: '3ds_done',
        AuthorizationData: { eci: '05', cavv: 'final-cavv' },
      });
    const client = makeClient();
    const res = await client.complete3ds({
      threeDsSessionId: '3ds_done',
      paRes: 'pares-blob',
    });
    expect(res.AuthorizationData?.cavv).toBe('final-cavv');
  });

  it('complete validates paRes or cres is provided', async () => {
    const client = makeClient();
    await expect(
      client.complete3ds({ threeDsSessionId: '3ds_x' }),
    ).rejects.toThrow(/paRes or cres/);
  });
});
