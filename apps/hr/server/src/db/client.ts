import { PrismaClient } from "@prisma/client";
import { attachPrismaAuditMiddleware } from '@catering/audit-enforcement';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

attachPrismaAuditMiddleware(prisma, {
  // ראה: packages/audit-enforcement/INTEGRATION-GUIDE.md
  excludeModels: ['AuditLog', 'LoginAttempt', 'SensitiveAccess'],
});

