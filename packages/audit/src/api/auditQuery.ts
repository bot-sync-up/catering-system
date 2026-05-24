import type { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';

export const auditQuerySchema = z.object({
  // Free-text search across entityType, entityId, userAgent, ip, JSON values
  q: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  action: z
    .enum([
      'CREATE',
      'UPDATE',
      'DELETE',
      'READ_SENSITIVE',
      'LOGIN_SUCCESS',
      'LOGIN_FAILURE',
      'LOGOUT',
      'PASSWORD_CHANGE',
      'ROLE_CHANGE',
      'OFFICIAL_TAG_CHANGE',
      'EXPORT',
      'PERMISSION_DENIED',
    ])
    .optional(),
  ip: z.string().optional(),
  tenantId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
  sort: z.enum(['asc', 'desc']).default('desc'),
});

export type AuditQuery = z.infer<typeof auditQuerySchema>;

export interface AuditQueryResult {
  total: number;
  page: number;
  pageSize: number;
  rows: Array<{
    id: string;
    userId: string | null;
    entityType: string;
    entityId: string | null;
    action: string;
    oldValues: unknown;
    newValues: unknown;
    ip: string | null;
    userAgent: string | null;
    timestamp: Date;
    tenantId: string | null;
  }>;
}

export async function queryAuditLogs(
  prisma: PrismaClient,
  q: AuditQuery,
): Promise<AuditQueryResult> {
  const where: Prisma.AuditLogWhereInput = {};

  if (q.userId) where.userId = q.userId;
  if (q.entityType) where.entityType = q.entityType;
  if (q.entityId) where.entityId = q.entityId;
  if (q.action) where.action = q.action;
  if (q.ip) where.ip = q.ip;
  if (q.tenantId) where.tenantId = q.tenantId;
  if (q.from || q.to) {
    where.timestamp = {};
    if (q.from) where.timestamp.gte = q.from;
    if (q.to) where.timestamp.lte = q.to;
  }
  if (q.q) {
    // Hebrew-friendly contains search across the indexed scalar columns.
    // JSON fields are searched separately via raw queries when needed.
    where.OR = [
      { entityType: { contains: q.q, mode: 'insensitive' } },
      { entityId: { contains: q.q, mode: 'insensitive' } },
      { userAgent: { contains: q.q, mode: 'insensitive' } },
      { ip: { contains: q.q, mode: 'insensitive' } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: q.sort },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);

  return {
    total,
    page: q.page,
    pageSize: q.pageSize,
    rows: rows.map((r) => ({
      id: r.id.toString(),
      userId: r.userId,
      entityType: r.entityType,
      entityId: r.entityId,
      action: r.action,
      oldValues: r.oldValues,
      newValues: r.newValues,
      ip: r.ip,
      userAgent: r.userAgent,
      timestamp: r.timestamp,
      tenantId: r.tenantId,
    })),
  };
}
