/**
 * Mock Prisma client לטסטים — תומך בכל המודלים שב-aggregations.
 */
import { vi } from "vitest";
import { mockDeep, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { setPrisma } from "../../src/utils/prisma.js";

export type MockedPrisma = DeepMockProxy<PrismaClient>;

export function buildMockPrisma(): MockedPrisma {
  const mock = mockDeep<PrismaClient>();
  setPrisma(mock as unknown as PrismaClient);
  return mock;
}

export function resetMocks(): void {
  vi.clearAllMocks();
}
