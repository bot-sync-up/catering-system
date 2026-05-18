import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/**
 * Segment rules schema (JSON tree):
 * {
 *   op: 'AND' | 'OR',
 *   children: Array<Rule | RuleNode>
 * }
 * Rule: { field: string, op: 'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'contains'|'in'|'tag'|'hasEvent', value: any }
 * Supported fields: status, score, language, source, country, createdAt, tags, attributes.<key>, event.<type>
 */

export type RuleOp =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'in' | 'tag' | 'hasEvent' | 'noEvent';

export interface Rule {
  field: string;
  op: RuleOp;
  value: any;
}

export interface RuleNode {
  op: 'AND' | 'OR';
  children: Array<Rule | RuleNode>;
}

function isNode(x: any): x is RuleNode {
  return x && (x.op === 'AND' || x.op === 'OR') && Array.isArray(x.children);
}

/** Compile the JSON rules tree into a Prisma where clause for the Lead model. */
export function compileRules(node: RuleNode | Rule | null | undefined): Prisma.LeadWhereInput {
  if (!node) return {};
  if (isNode(node)) {
    const childs = node.children.map(compileRules);
    return node.op === 'AND' ? { AND: childs } : { OR: childs };
  }
  return ruleToWhere(node);
}

function ruleToWhere(r: Rule): Prisma.LeadWhereInput {
  const { field, op, value } = r;

  if (field === 'tags') {
    if (op === 'tag' || op === 'contains') return { tags: { has: String(value) } };
    if (op === 'in') return { tags: { hasSome: value as string[] } };
  }

  if (field.startsWith('attributes.')) {
    const key = field.slice('attributes.'.length);
    // JSON path filter
    const path = key.split('.');
    if (op === 'eq') return { attributes: { path, equals: value } };
    if (op === 'neq') return { NOT: { attributes: { path, equals: value } } };
    if (op === 'gt') return { attributes: { path, gt: value } };
    if (op === 'gte') return { attributes: { path, gte: value } };
    if (op === 'lt') return { attributes: { path, lt: value } };
    if (op === 'lte') return { attributes: { path, lte: value } };
    if (op === 'contains') return { attributes: { path, string_contains: String(value) } };
  }

  if (field.startsWith('event.')) {
    const type = field.slice('event.'.length);
    if (op === 'hasEvent') return { events: { some: { type } } };
    if (op === 'noEvent') return { events: { none: { type } } };
  }

  // Plain scalar fields
  const scalar: Record<string, any> = {};
  if (op === 'eq') scalar[field] = value;
  else if (op === 'neq') scalar[field] = { not: value };
  else if (op === 'gt') scalar[field] = { gt: value };
  else if (op === 'gte') scalar[field] = { gte: value };
  else if (op === 'lt') scalar[field] = { lt: value };
  else if (op === 'lte') scalar[field] = { lte: value };
  else if (op === 'contains') scalar[field] = { contains: value, mode: 'insensitive' };
  else if (op === 'in') scalar[field] = { in: value };
  return scalar as Prisma.LeadWhereInput;
}

/** Count current leads matching a segment without persisting members. */
export async function previewSegment(rules: RuleNode | Rule) {
  const where = compileRules(rules);
  const count = await prisma.lead.count({ where });
  const sample = await prisma.lead.findMany({ where, take: 10 });
  return { count, sample };
}

/** Materialize members for a segment (also used for dynamic re-evaluation). */
export async function evaluateSegment(segmentId: string) {
  const seg = await prisma.segment.findUniqueOrThrow({ where: { id: segmentId } });
  const where = compileRules(seg.rules as any);
  const leads = await prisma.lead.findMany({ where, select: { id: true } });

  await prisma.$transaction([
    prisma.segmentMember.deleteMany({ where: { segmentId } }),
    prisma.segmentMember.createMany({
      data: leads.map((l) => ({ segmentId, leadId: l.id })),
      skipDuplicates: true,
    }),
    prisma.segment.update({
      where: { id: segmentId },
      data: { memberCount: leads.length, lastEvaluatedAt: new Date() },
    }),
  ]);

  return { count: leads.length };
}

/** Called from event handlers: re-check membership for one lead across all DYNAMIC segments. */
export async function updateLeadSegments(leadId: string) {
  const segments = await prisma.segment.findMany({ where: { type: 'DYNAMIC' } });
  for (const seg of segments) {
    const where = { ...compileRules(seg.rules as any), id: leadId };
    const matches = (await prisma.lead.count({ where })) > 0;
    if (matches) {
      await prisma.segmentMember.upsert({
        where: { segmentId_leadId: { segmentId: seg.id, leadId } },
        create: { segmentId: seg.id, leadId },
        update: {},
      });
    } else {
      await prisma.segmentMember
        .delete({ where: { segmentId_leadId: { segmentId: seg.id, leadId } } })
        .catch(() => null);
    }
  }
}
