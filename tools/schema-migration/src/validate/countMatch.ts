/**
 * Validation: בדיקה שמספר הרשומות אחרי המיגרציה תואם למספר הרשומות לפני.
 * (פר טבלה — מקור מול יעד).
 */

import type { PrismaClient } from "@prisma/client";
import type { Pool } from "pg";
import type { SourceModule } from "../types.js";

export interface CountMatchResult {
  sourceModule: SourceModule;
  sourceTable: string;
  targetModel: string;
  sourceCount: number;
  targetCount: number;
  expectedFilter?: string;
  ok: boolean;
  diff: number;
}

export interface CountMatchSpec {
  sourceModule: SourceModule;
  sourceTable: string;
  /** filter SQL (אופציונלי) — למשל "WHERE type='INVOICE'". */
  sourceFilter?: string;
  targetModel: string;
  /** שם הטבלה ב־DB יעד (snake_case). */
  targetTable: string;
  targetFilter?: string;
}

const DEFAULT_SPECS: CountMatchSpec[] = [
  { sourceModule: "crm", sourceTable: "Customer", targetModel: "Customer", targetTable: "customers" },
  { sourceModule: "crm", sourceTable: "Lead", targetModel: "Lead", targetTable: "leads" },
  { sourceModule: "orders", sourceTable: "Order", targetModel: "Event", targetTable: "events" },
  {
    sourceModule: "finance-docs",
    sourceTable: "Document",
    sourceFilter: "WHERE type = 'INVOICE'",
    targetModel: "Invoice",
    targetTable: "invoices",
  },
  { sourceModule: "finance-docs", sourceTable: "Payment", targetModel: "Payment", targetTable: "payments" },
  { sourceModule: "hr", sourceTable: "Employee", targetModel: "Employee", targetTable: "employees" },
  { sourceModule: "fleet", sourceTable: "Vehicle", targetModel: "Vehicle", targetTable: "vehicles" },
  { sourceModule: "expenses", sourceTable: "Expense", targetModel: "Expense", targetTable: "expenses" },
];

export async function runCountMatch(
  prisma: PrismaClient,
  sourcePools: Partial<Record<SourceModule, Pool>>,
  specs: CountMatchSpec[] = DEFAULT_SPECS,
): Promise<CountMatchResult[]> {
  const results: CountMatchResult[] = [];
  for (const spec of specs) {
    const pool = sourcePools[spec.sourceModule];
    if (!pool) continue;

    const srcSql = `SELECT COUNT(*)::int AS c FROM "${spec.sourceTable}" ${spec.sourceFilter ?? ""}`;
    const tgtSql = `SELECT COUNT(*)::int AS c FROM ${spec.targetTable} ${spec.targetFilter ?? ""}`;

    const [src, tgt] = await Promise.all([
      pool.query(srcSql),
      prisma.$queryRawUnsafe<Array<{ c: number }>>(tgtSql),
    ]);
    const sourceCount = (src.rows[0] as { c: number } | undefined)?.c ?? 0;
    const targetCount = tgt[0]?.c ?? 0;
    results.push({
      sourceModule: spec.sourceModule,
      sourceTable: spec.sourceTable,
      targetModel: spec.targetModel,
      sourceCount,
      targetCount,
      expectedFilter: spec.sourceFilter,
      ok: sourceCount === targetCount,
      diff: targetCount - sourceCount,
    });
  }
  return results;
}
