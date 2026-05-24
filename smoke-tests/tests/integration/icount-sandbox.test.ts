import { describe, it, expect, beforeAll } from 'vitest';

const API = process.env.API_URL || 'http://localhost:3000';

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

describe('iCount sandbox smoke', () => {
  let token = '';
  let invoiceId = '';

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

  it('createInvoice returns docNumber', async () => {
    const r = await api(
      '/icount/invoices',
      {
        method: 'POST',
        body: JSON.stringify({
          customerName: 'Smoke Test Customer',
          customerTaxId: '000000000',
          items: [{ description: 'Catering service', quantity: 1, unitPrice: 100, vatRate: 18 }],
        }),
      },
      token
    );
    expect([200, 201]).toContain(r.status);
    invoiceId = r.body.docNumber || r.body.id || r.body.invoiceId;
    expect(invoiceId).toBeTruthy();
  });

  it('allocation links payment to invoice', async () => {
    const r = await api(
      '/icount/allocations',
      {
        method: 'POST',
        body: JSON.stringify({
          invoiceId,
          paymentAmount: 118,
          paymentMethod: 'credit_card',
        }),
      },
      token
    );
    expect([200, 201]).toContain(r.status);
  });

  it('invoice marked archived after allocation', async () => {
    const r = await api(`/icount/invoices/${invoiceId}`, {}, token);
    expect(r.status).toBe(200);
    expect(r.body.status || r.body.state).toMatch(/archived|paid|allocated|closed/i);
  });
});
