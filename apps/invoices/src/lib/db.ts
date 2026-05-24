import { PrismaClient } from '@prisma/client';
import { attachPrismaAuditMiddleware } from '@catering/audit-enforcement';

export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

attachPrismaAuditMiddleware(prisma, {
  // ראה: packages/audit-enforcement/INTEGRATION-GUIDE.md
  excludeModels: ['AuditLog', 'LoginAttempt', 'SensitiveAccess'],
});

