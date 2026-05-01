// Re-export Prisma Client and types for consumers across the monorepo.
import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Singleton Prisma client. In dev/HMR contexts we cache on globalThis to avoid
 * exhausting database connections.
 */
export const prisma: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["error", "warn"]
        : ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export default prisma;
