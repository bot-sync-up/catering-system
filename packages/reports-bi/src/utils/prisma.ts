/**
 * Prisma client singleton — לייבוא ע"י כל אגרגציה.
 * משאיר מקום להחלפה ב-mock לטסטים (vitest-mock-extended).
 */
import { PrismaClient } from "@prisma/client";

let _prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = new PrismaClient({
      log: process.env.PRISMA_LOG === "1" ? ["query", "warn", "error"] : ["error"],
    });
  }
  return _prisma;
}

export function setPrisma(client: PrismaClient): void {
  _prisma = client;
}

export async function disconnect(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
  }
}
