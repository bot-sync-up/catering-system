import { describe, it, expect, beforeAll, vi } from 'vitest';

const API = process.env.API_URL || 'http://localhost:3000';
const CARDCOM_MOCK = process.env.CARDCOM_MOCK !== 'false';

async function api(path: string, opts: RequestInit = {}, token?: string) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

describe('CardCom sandbox smoke', () => {
  let token = '';

  beforeAll(async () => {
    const r = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: process.env.SEED_ADMIN_EMAIL || 'admin@demo.local',
        password: process.env.SEED_ADMIN_PASSWORD || 'admin',
      }),
    });
    token = r.body.accessToken || '';
  });

  it('tokenize test card returns token', async () => {
    const r = await api(
      '/payments/cardcom/tokenize',
      {
        method: 'POST',
        body: JSON.stringify({
          cardNumber: '4580000000000000',
          expMonth: '12',
          expYear: '2030',
          cvv: '123',
          holderName: 'Smoke Test',
        }),
      },
      token
    );
    expect([200, 201]).toContain(r.status);
    expect(r.body.token || r.body.cardToken).toBeTruthy();
  });

  it('charge against token (1 ILS test)', async () => {
    const tok = await api(
      '/payments/cardcom/tokenize',
      {
        method: 'POST',
        body: JSON.stringify({
          cardNumber: '4580000000000000',
          expMonth: '12',
          expYear: '2030',
          cvv: '123',
          holderName: 'Smoke',
        }),
      },
      token
    );
    const cardToken = tok.body.token || tok.body.cardToken;

    const charge = await api(
      '/payments/cardcom/charge',
      {
        method: 'POST',
        body: JSON.stringify({ token: cardToken, amount: 1.0, currency: 'ILS' }),
      },
      token
    );
    expect([200, 201]).toContain(charge.status);
    expect(charge.body.transactionId || charge.body.id).toBeTruthy();
    expect(charge.body.status).toMatch(/success|approved|ok/i);
  });

  it('refund a charge', async () => {
    const tok = await api(
      '/payments/cardcom/tokenize',
      {
        method: 'POST',
        body: JSON.stringify({
          cardNumber: '4580000000000000',
          expMonth: '12',
          expYear: '2030',
          cvv: '123',
          holderName: 'Smoke',
        }),
      },
      token
    );
    const charge = await api(
      '/payments/cardcom/charge',
      {
        method: 'POST',
        body: JSON.stringify({
          token: tok.body.token || tok.body.cardToken,
          amount: 1.0,
        }),
      },
      token
    );
    const txId = charge.body.transactionId || charge.body.id;

    const refund = await api(
      '/payments/cardcom/refund',
      { method: 'POST', body: JSON.stringify({ transactionId: txId, amount: 1.0 }) },
      token
    );
    expect([200, 201]).toContain(refund.status);
  });
});
