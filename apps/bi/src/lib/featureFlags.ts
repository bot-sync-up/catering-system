import { prisma } from './prisma';
import { Role } from '@prisma/client';
import crypto from 'crypto';

export interface FlagEvaluationContext {
  userId?: string;
  role?: Role;
}

/**
 * Feature Flag spec:
 *   { key, enabled, rolloutPercent (0..100), targetRoles[] }
 *
 * Evaluation rules (in order):
 *   1. enabled=false → off
 *   2. targetRoles set and user.role not in targetRoles → off
 *   3. rolloutPercent < 100 → deterministic hash(userId+key) % 100 < rolloutPercent
 *   4. otherwise → on
 */
export async function isEnabled(
  key: string,
  ctx: FlagEvaluationContext = {},
): Promise<boolean> {
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  if (!flag || !flag.enabled) return false;

  if (flag.targetRoles.length > 0) {
    if (!ctx.role || !flag.targetRoles.includes(ctx.role)) return false;
  }

  if (flag.rolloutPercent >= 100) return true;
  if (flag.rolloutPercent <= 0) return false;

  const seed = `${ctx.userId ?? 'anon'}:${key}`;
  const hash = crypto.createHash('sha256').update(seed).digest();
  const bucket = hash.readUInt32BE(0) % 100;
  return bucket < flag.rolloutPercent;
}

export async function listFlags() {
  return prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
}

export async function upsertFlag(input: {
  key: string;
  enabled: boolean;
  rolloutPercent: number;
  targetRoles: Role[];
  description?: string;
}) {
  if (input.rolloutPercent < 0 || input.rolloutPercent > 100) {
    throw new Error('rolloutPercent must be between 0 and 100');
  }
  return prisma.featureFlag.upsert({
    where: { key: input.key },
    update: {
      enabled: input.enabled,
      rolloutPercent: input.rolloutPercent,
      targetRoles: input.targetRoles,
      description: input.description,
    },
    create: {
      key: input.key,
      enabled: input.enabled,
      rolloutPercent: input.rolloutPercent,
      targetRoles: input.targetRoles,
      description: input.description,
    },
  });
}

export async function deleteFlag(key: string) {
  await prisma.featureFlag.delete({ where: { key } });
}
