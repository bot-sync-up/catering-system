import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = process.env.API_URL || 'http://localhost:3000';

async function login(email: string, password: string) {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return (await r.json()).accessToken as string;
}

describe('VAT 18% smoke (Israel 2025+)', () => {
  let token = '';

  beforeAll(async () => {
    await prisma.$connect();
    token = await login(
      process.env.SEED_ADMIN_EMAIL || 'admin@demo.local',
      process.env.SEED_ADMIN_PASSWORD || 'admin'
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('new invoice uses vatRate=18', async () => {
    const customer = await prisma.customer.findFirst();
    expect(customer).toBeTruthy();

    const r = await fetch(`${API}/invoices`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        customerId: customer!.id,
        items: [{ description: 'Smoke test item', quantity: 1, unitPrice: 100 }],
      }),
    });
    expect(r.status).toBeLessThan(400);
    const inv = await r.json();
    const id = inv.id || inv.data?.id;

    const saved = await prisma.invoice.findUnique({ where: { id } });
    expect(saved?.vatRate).toBe(18);
    expect(Number(saved?.vatAmount)).toBeCloseTo(18, 1);
    expect(Number(saved?.totalAmount)).toBeCloseTo(118, 1);

    await prisma.invoice.delete({ where: { id } }).catch(() => {});
  });

  it('config returns vatRate=18 for tenant locale=IL', async () => {
    const r = await fetch(`${API}/config/vat`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (r.status === 404) return;
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.rate || body.vatRate).toBe(18);
  });
});
