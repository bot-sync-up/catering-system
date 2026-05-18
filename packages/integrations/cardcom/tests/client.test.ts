import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CardComClient } from '../src/client/CardComClient';
import { CardComError } from '../src/utils/errors';

vi.mock('axios', async () => {
  const create = vi.fn();
  return {
    default: { create },
    create,
  };
});

import axios from 'axios';

function makeClient() {
  return new CardComClient({
    terminal: 1000,
    username: 'u',
    apiName: 'api',
  });
}

describe('CardComClient', () => {
  const post = vi.fn();
  beforeEach(() => {
    post.mockReset();
    (axios.create as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ post });
  });

  it('createLowProfile sends amount + numOfPayments and returns iframe url', async () => {
    post.mockResolvedValue({
      status: 200,
      data: { ResponseCode: 0, LowProfileId: 'lp_1', Url: 'https://cc/iframe' },
    });
    const c = makeClient();
    const r = await c.createLowProfile({
      amount: 99.9,
      numOfPayments: 3,
      productName: 'מוצר',
      successUrl: 'https://app/s',
      failedUrl: 'https://app/f',
    });
    expect(r.url).toBe('https://cc/iframe');
    expect(r.lowProfileId).toBe('lp_1');
    const sent = post.mock.calls[0][1];
    expect(sent.Amount).toBe(99.9);
    expect(sent.NumOfPayments).toBe(3);
    expect(sent.TerminalNumber).toBe(1000);
  });

  it('charge with token returns transactionId', async () => {
    post.mockResolvedValue({
      status: 200,
      data: { ResponseCode: 0, TranzactionId: 'tx_42', ApprovalNumber: 'A1' },
    });
    const c = makeClient();
    const r = await c.charge({
      amount: 50,
      numOfPayments: 1,
      token: 'tok_abc',
    });
    expect(r.transactionId).toBe('tx_42');
    expect(r.approvalNumber).toBe('A1');
  });

  it('refund supports partial sum', async () => {
    post.mockResolvedValue({
      status: 200,
      data: { ResponseCode: 0, NewTranzactionId: 'tx_r' },
    });
    const c = makeClient();
    await c.refund({ transactionId: 'tx_42', amount: 25, reason: 'בקשת לקוח' });
    expect(post.mock.calls[0][1].PartialSum).toBe(25);
    expect(post.mock.calls[0][1].TranzactionId).toBe('tx_42');
  });

  it('throws CardComError on non-zero ResponseCode', async () => {
    post.mockResolvedValue({
      status: 200,
      data: { ResponseCode: 600, Description: 'Card declined' },
    });
    const c = makeClient();
    await expect(
      c.charge({ amount: 10, numOfPayments: 1, token: 'tok' })
    ).rejects.toBeInstanceOf(CardComError);
  });

  it('numOfPayments validation: 1-12 range', async () => {
    const c = makeClient();
    await expect(
      c.createLowProfile({
        amount: 1,
        numOfPayments: 13,
        productName: 'x',
        successUrl: 'https://a/s',
        failedUrl: 'https://a/f',
      })
    ).rejects.toThrow();
  });

  it('tokenize prefers fromTransactionId (zero-PCI)', async () => {
    post.mockResolvedValue({
      status: 200,
      data: { ResponseCode: 0, Token: 'tok_new', Last4: '1234' },
    });
    const c = makeClient();
    const r = await c.tokenize({ fromTransactionId: 'tx_42' });
    expect(r.token).toBe('tok_new');
    expect(post.mock.calls[0][1].TranzactionId).toBe('tx_42');
    expect(post.mock.calls[0][1].CardNumber).toBeUndefined();
  });

  it('createRecurring sends frequency + start date', async () => {
    post.mockResolvedValue({
      status: 200,
      data: { ResponseCode: 0, RecurringId: 'rec_1' },
    });
    const c = makeClient();
    const r = await c.createRecurring({
      token: 'tok_abc',
      amount: 99,
      frequency: 'monthly',
      startDate: '2026-06-01',
      customerExternalId: 'cust_1',
      productName: 'מנוי',
    });
    expect(r.recurringId).toBe('rec_1');
  });

  it('cancelRecurring sends recurring id', async () => {
    post.mockResolvedValue({ status: 200, data: { ResponseCode: 0 } });
    const c = makeClient();
    const r = await c.cancelRecurring({ recurringId: 'rec_1', reason: 'לקוח ביטל' });
    expect(r.cancelled).toBe(true);
    expect(post.mock.calls[0][1].RecurringId).toBe('rec_1');
  });
});
