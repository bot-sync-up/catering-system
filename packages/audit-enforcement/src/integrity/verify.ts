/**
 * verifyHashChain — סורק את כל יומן הביקורת ומאתר רשומות שה-hash שלהן
 * לא תואם את התוכן או שהקישור לרשומה הקודמת נשבר.
 */
import type { PrismaClient } from '@prisma/client';
import { computeRowHash, type AuditLogPayload } from './hashChain';

export interface VerificationResult {
  ok: boolean;
  totalChecked: number;
  brokenRows: BrokenRow[];
  /** משך הריצה במילישניות */
  durationMs: number;
}

export interface BrokenRow {
  id: string;
  reason: 'hash_mismatch' | 'prev_hash_mismatch';
  expectedHash?: string;
  actualHash?: string;
  expectedPrevHash?: string | null;
  actualPrevHash?: string | null;
  createdAt: Date;
}

interface DbRow extends AuditLogPayload {
  id: string;
  hash: string;
  prevHash: string | null;
}

export async function verifyHashChain(
  prisma: PrismaClient,
  options: { batchSize?: number; since?: Date } = {},
): Promise<VerificationResult> {
  const batchSize = options.batchSize ?? 1000;
  const started = Date.now();
  const broken: BrokenRow[] = [];

  let cursor: string | undefined = undefined;
  let expectedPrev: string | null = null;
  let total = 0;
  let isFirstBatch = true;

  while (true) {
    // @ts-expect-error — AuditLog
    const rows: DbRow[] = await prisma.auditLog.findMany({
      where: options.since ? { createdAt: { gte: options.since } } : undefined,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (rows.length === 0) break;

    if (isFirstBatch && options.since) {
      // אם מתחילים באמצע — קח את prevHash מהרשומה הראשונה כ-baseline
      expectedPrev = rows[0].prevHash;
    }
    isFirstBatch = false;

    for (const row of rows) {
      total++;
      const recomputed = computeRowHash(
        {
          model: row.model,
          action: row.action,
          recordId: row.recordId,
          oldValues: row.oldValues,
          newValues: row.newValues,
          userId: row.userId,
          ip: row.ip,
          userAgent: row.userAgent,
          requestId: row.requestId,
          tenantId: row.tenantId,
          role: row.role,
          channel: row.channel,
          createdAt: row.createdAt,
        },
        row.prevHash,
      );
      if (recomputed !== row.hash) {
        broken.push({
          id: row.id,
          reason: 'hash_mismatch',
          expectedHash: recomputed,
          actualHash: row.hash,
          createdAt: row.createdAt,
        });
      }
      if (row.prevHash !== expectedPrev) {
        broken.push({
          id: row.id,
          reason: 'prev_hash_mismatch',
          expectedPrevHash: expectedPrev,
          actualPrevHash: row.prevHash,
          createdAt: row.createdAt,
        });
      }
      expectedPrev = row.hash;
    }

    cursor = rows[rows.length - 1].id;
    if (rows.length < batchSize) break;
  }

  return {
    ok: broken.length === 0,
    totalChecked: total,
    brokenRows: broken,
    durationMs: Date.now() - started,
  };
}
