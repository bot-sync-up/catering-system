import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { CardcomClient } from '../src/CardcomClient';
import { CardcomError } from '../src/errors';

const BASE = 'https://sandbox.cardcom.solutions';
const PATH = '/api/v11';

function makeClient(overrides: Partial<ConstructorParameters<typeof CardcomClient>[0]> = {}) {
  return new CardcomClient({
    credentials: { terminalNumber: '1000', apiName: 'unit-test', apiPassword: 'pw' },
    environment: 'sandbox',
    retry: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5, random: () => 0 },
    ...overrides,
  });
}

describe('CardcomClient', () => {
  beforeEach(() => {
    nock.cleanAll();
    nock.disableNetConnect();
  });
  afterEach(() => {
    nock.enableNetConnect();
  });

  it('createLowProfile returns iframe URL on success', async () => {
    nock(BASE)
      .post(`${PATH}/LowProfile/Create`)
      .reply(200, {
        ResponseCode: 0,
        Description: 'OK',
        LowProfileId: 'lp_abc',
        Url: 'https://secure.cardcom.solutions/lp/iframe/lp_abc',
      });

    const client = makeClient();
    const res = await client.createLowProfile({
      amount: 49.9,
      currency: 'ILS',
      successUrl: 'https://app.example/ok',
      failedUrl: 'https://app.example/fail',
      productName: 'Test product',
    });
    expect(res.LowProfileId).toBe('lp_abc');
    expect(res.Url).toMatch(/iframe/);
  });

  it('getLowProfileResult surfaces a 9XX failure as parsed result', async () => {
    nock(BASE)
      .post(`${PATH}/LowProfile/GetLpResult`)
      .reply(200, { ResponseCode: 901, Description: 'Timeout', LowProfileId: 'lp_x' });
    const client = makeClient();
    const res = await client.getLowProfileResult('lp_x');
    expect(res.ResponseCode).toBe(901);
  });

  it('charge throws CardcomError on declined ResponseCode', async () => {
    nock(BASE)
      .post(`${PATH}/Transactions/Transaction`)
      .reply(200, { ResponseCode: 7, Description: 'Declined', TranzactionId: 0, Amount: 10 });
    const client = makeClient();
    await expect(
      client.charge({
        amount: 10,
        currency: 'ILS',
        token: 'tok_abcd1234',
        productName: 'X',
      }),
    ).rejects.toThrow(CardcomError);
  });

  it('charge succeeds and returns parsed response', async () => {
    nock(BASE)
      .post(`${PATH}/Transactions/Transaction`)
      .reply(200, {
        ResponseCode: 0,
        Description: 'Approved',
        TranzactionId: 555,
        ApprovalNumber: '999',
        Amount: 10,
        CoinId: 1,
        Last4CardDigits: '4242',
        Token: 'tok_abcd1234',
      });
    const client = makeClient();
    const out = await client.charge({
      amount: 10,
      currency: 'ILS',
      token: 'tok_abcd1234',
      productName: 'X',
    });
    expect(out.TranzactionId).toBe(555);
    expect(out.Last4CardDigits).toBe('4242');
  });

  it('charge retries on 503 + ResponseCode 902', async () => {
    nock(BASE)
      .post(`${PATH}/Transactions/Transaction`)
      .reply(503, { ResponseCode: 902, Description: 'Transient' })
      .post(`${PATH}/Transactions/Transaction`)
      .reply(200, {
        ResponseCode: 0,
        TranzactionId: 777,
        Amount: 10,
      });
    const client = makeClient();
    const out = await client.charge({
      amount: 10,
      currency: 'ILS',
      token: 'tok_abcd1234',
      productName: 'X',
    });
    expect(out.TranzactionId).toBe(777);
  });

  it('refund succeeds', async () => {
    nock(BASE)
      .post(`${PATH}/Transactions/RefundByTransactionId`)
      .reply(200, { ResponseCode: 0, TranzactionId: 555, RefundedAmount: 5 });
    const client = makeClient();
    const out = await client.refund({ tranzactionId: 555, partialSum: 5 });
    expect(out.RefundedAmount).toBe(5);
  });

  it('tokenize REJECTS raw PAN', async () => {
    const client = makeClient();
    await expect(
      // @ts-expect-error — deliberately passing forbidden field
      client.tokenize({ token: 'tok_abcd1234', cardNumber: '4242424242424242' }),
    ).rejects.toThrow(/raw card data/);
  });

  it('tokenize succeeds for token-only input', async () => {
    nock(BASE)
      .post(`${PATH}/Tokens/CreateTokenFromToken`)
      .reply(200, { ResponseCode: 0, Token: 'tok_newxyz1234', Last4CardDigits: '4242' });
    const client = makeClient();
    const out = await client.tokenize({ token: 'tok_oldxyz1234' });
    expect(out.Token).toBe('tok_newxyz1234');
  });

  it('createRecurring sends ISO start date', async () => {
    nock(BASE)
      .post(`${PATH}/Recurring/Create`, (body) => body.StartAt && /T/.test(body.StartAt))
      .reply(200, { ResponseCode: 0, RecurringId: 'rec_xyz' });
    const client = makeClient();
    const out = await client.createRecurring({
      token: 'tok_abcd1234',
      amount: 19.99,
      currency: 'ILS',
      productName: 'Sub',
      interval: 'MONTHLY',
      startAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    expect(out.RecurringId).toBe('rec_xyz');
  });

  it('cancelRecurring succeeds', async () => {
    nock(BASE)
      .post(`${PATH}/Recurring/Cancel`)
      .reply(200, { ResponseCode: 0, Description: 'cancelled' });
    const client = makeClient();
    const out = await client.cancelRecurring({ recurringId: 'rec_xyz', reason: 'user-req' });
    expect(out.ResponseCode).toBe(0);
  });

  it('Zod validation rejects negative amount', async () => {
    const client = makeClient();
    await expect(
      client.charge({
        amount: -1,
        currency: 'ILS',
        token: 'tok_abcd1234',
        productName: 'X',
      }),
    ).rejects.toThrow();
  });
});
