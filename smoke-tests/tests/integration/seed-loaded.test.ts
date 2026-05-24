import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Seed data smoke', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('has tenant "demo"', async () => {
    const tenant = await prisma.tenant.findFirst({ where: { slug: 'demo' } });
    expect(tenant).toBeTruthy();
    expect(tenant?.slug).toBe('demo');
  });

  it('has at least 50 customers in demo tenant', async () => {
    const tenant = await prisma.tenant.findFirst({ where: { slug: 'demo' } });
    const count = await prisma.customer.count({ where: { tenantId: tenant!.id } });
    expect(count).toBeGreaterThanOrEqual(50);
  });

  it('has at least 30 events in demo tenant', async () => {
    const tenant = await prisma.tenant.findFirst({ where: { slug: 'demo' } });
    const count = await prisma.event.count({ where: { tenantId: tenant!.id } });
    expect(count).toBeGreaterThanOrEqual(30);
  });

  it('seeded admin user exists', async () => {
    const admin = await prisma.user.findFirst({
      where: { email: { contains: 'admin' } },
    });
    expect(admin).toBeTruthy();
  });

  it('seed includes price list & menu items', async () => {
    const menuCount = await prisma.menuItem.count();
    expect(menuCount).toBeGreaterThan(0);
  });
});
