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

describe('Audit log smoke', () => {
  let token = '';
  let createdCustomerId = '';

  beforeAll(async () => {
    await prisma.$connect();
    token = await login(
      process.env.SEED_ADMIN_EMAIL || 'admin@demo.local',
      process.env.SEED_ADMIN_PASSWORD || 'admin'
    );
  });

  afterAll(async () => {
    if (createdCustomerId) {
      await prisma.customer.delete({ where: { id: createdCustomerId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('creating a customer writes an audit_log entry', async () => {
    const before = await prisma.auditLog.count();

    const r = await fetch(`${API}/customers`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: `Smoke Customer ${Date.now()}`,
        phone: '050-0000000',
      }),
    });
    const body = await r.json();
    createdCustomerId = body.id || body.data?.id;
    expect(createdCustomerId).toBeTruthy();

    await new Promise((r) => setTimeout(r, 500));

    const after = await prisma.auditLog.count();
    expect(after).toBeGreaterThan(before);

    const entry = await prisma.auditLog.findFirst({
      where: { entityType: 'Customer', entityId: createdCustomerId },
      orderBy: { createdAt: 'desc' },
    });
    expect(entry).toBeTruthy();
    expect(entry?.action).toMatch(/create|insert/i);
    expect(entry?.userId).toBeTruthy();
  });
});
