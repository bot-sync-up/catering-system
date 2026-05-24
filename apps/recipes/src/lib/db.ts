import { PrismaClient } from '@prisma/client';
import { attachPrismaAuditMiddleware } from '@catering/audit-enforcement';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ['warn', 'error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
