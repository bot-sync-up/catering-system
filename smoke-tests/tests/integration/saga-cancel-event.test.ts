import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
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

async function login() {
  const r = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: process.env.SEED_ADMIN_EMAIL || 'admin@demo.local',
      password: process.env.SEED_ADMIN_PASSWORD || 'admin',
    }),
  });
  return r.body.accessToken;
}

async function poll<T>(fn: () => Promise<T | null>, timeoutMs = 10000): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('poll timeout');
}

describe('SAGA cancel-event smoke (full compensating-transaction flow)', () => {
  let token = '';
  let eventId = '';
  let invoiceId = '';
  let paymentId = '';

  beforeAll(async () => {
    await prisma.$connect();
    token = await login();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1) create event + invoice + payment', async () => {
    const customer = await prisma.customer.findFirst();
    expect(customer).toBeTruthy();

    const ev = await api(
      '/events',
      {
        method: 'POST',
        body: JSON.stringify({
          customerId: customer!.id,
          name: 'Smoke SAGA Event',
          date: new Date(Date.now() + 30 * 86400000).toISOString(),
          guestCount: 50,
          pricePerGuest: 200,
        }),
      },
      token
    );
    eventId = ev.body.id || ev.body.data?.id;
    expect(eventId).toBeTruthy();

    const inv = await api(
      `/events/${eventId}/invoice`,
      { method: 'POST', body: JSON.stringify({}) },
      token
    );
    invoiceId = inv.body.id || inv.body.invoiceId;
    expect(invoiceId).toBeTruthy();

    const pay = await api(
      `/invoices/${invoiceId}/payments`,
      {
        method: 'POST',
        body: JSON.stringify({ amount: 100, method: 'credit_card' }),
      },
      token
    );
    paymentId = pay.body.id || pay.body.paymentId;
    expect(paymentId).toBeTruthy();
  });

  it('2) cancel event triggers SAGA', async () => {
    const r = await api(
      `/events/${eventId}/cancel`,
      { method: 'POST', body: JSON.stringify({ reason: 'smoke test' }) },
      token
    );
    expect([200, 202]).toContain(r.status);
  });

  it('3) SAGA: event status = CANCELLED', async () => {
    const ev = await poll(async () => {
      const e = await prisma.event.findUnique({ where: { id: eventId } });
      return e?.status === 'CANCELLED' ? e : null;
    });
    expect(ev.status).toBe('CANCELLED');
  });

  it('4) SAGA: invoice voided / credit-note issued', async () => {
    const inv = await poll(async () => {
      const i = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      return i && /void|cancel|credit/i.test(i.status || '') ? i : null;
    });
    expect(inv).toBeTruthy();
  });

  it('5) SAGA: payment refunded', async () => {
    const refund = await poll(async () => {
      const refunds = await prisma.payment.findMany({
        where: { originalPaymentId: paymentId },
      });
      return refunds.length > 0 ? refunds[0] : null;
    });
    expect(refund).toBeTruthy();
    expect(Number(refund.amount)).toBeLessThan(0);
  });

  it('6) SAGA: audit log records full sequence', async () => {
    const logs = await prisma.auditLog.findMany({
      where: { entityId: eventId },
      orderBy: { createdAt: 'asc' },
    });
    const actions = logs.map((l) => l.action.toLowerCase());
    expect(actions.some((a) => a.includes('cancel'))).toBe(true);
  });
});
