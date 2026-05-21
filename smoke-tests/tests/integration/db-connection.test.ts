import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('DB connection smoke', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('connects to Postgres', async () => {
    const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    expect(result[0].ok).toBe(1);
  });

  it('supports transactions', async () => {
    const result = await prisma.$transaction(async (tx) => {
      const r = await tx.$queryRaw<{ n: number }[]>`SELECT 42 as n`;
      return r[0].n;
    });
    expect(result).toBe(42);
  });

  it('rolls back failed transactions', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT 1`;
        throw new Error('intentional rollback');
      })
    ).rejects.toThrow('intentional rollback');
  });

  it('reports server version', async () => {
    const result = await prisma.$queryRaw<{ version: string }[]>`SELECT version() as version`;
    expect(result[0].version).toMatch(/PostgreSQL/i);
  });
});
