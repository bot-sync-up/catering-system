/**
 * Extractor: הוצאות (Expense) — מהמודול הישן `agent-a016172202c9645f0/backend/prisma`.
 *
 * הסכמה הישנה:
 *   model Expense { id uuid, amount Decimal(14,2), currency, vatAmount Decimal(14,2)?,
 *     description, expenseDate, invoiceNumber?, invoiceUrl?, ocrData json?,
 *     source ExpenseSource, status ExpenseStatus,
 *     coaId, vendorId?, userId?, recurringId?, bankTransactionId?, ... }
 */

import type { Pool } from "pg";
import { wrap, type Extractor } from "./base.js";
import type { ExtractedRecord } from "../types.js";

export interface ExpensesExpenseRow {
  id: string;
  amount: string;
  currency: string;
  vatAmount: string | null;
  description: string;
  expenseDate: Date;
  invoiceNumber: string | null;
  invoiceUrl: string | null;
  ocrData: unknown;
  source: string;
  status: string;
  coaId: string;
  vendorId: string | null;
  userId: string | null;
  recurringId: string | null;
  bankTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ExpensesFromExpensesExtractor implements Extractor<ExpensesExpenseRow> {
  readonly sourceModule = "expenses" as const;
  readonly sourceTable = "Expense";
  readonly targetModelHint = "Expense";

  constructor(private readonly pool: Pool) {}

  async *extract(opts: { batchId: string; limit?: number }): AsyncIterable<ExtractedRecord<ExpensesExpenseRow>> {
    const sql = `
      SELECT id, amount::text AS amount, currency,
             "vatAmount"::text AS "vatAmount",
             description, "expenseDate", "invoiceNumber", "invoiceUrl",
             "ocrData", source::text AS source, status::text AS status,
             "coaId", "vendorId", "userId", "recurringId",
             "bankTransactionId", "createdAt", "updatedAt"
      FROM "Expense"
      ORDER BY "expenseDate" ASC
      ${opts.limit ? `LIMIT ${opts.limit}` : ""}
    `;
    const result = await this.pool.query(sql);
    for (const raw of result.rows as ExpensesExpenseRow[]) {
      yield wrap(raw, {
        sourceModule: this.sourceModule,
        sourceTable: this.sourceTable,
        originalId: raw.id,
        batchId: opts.batchId,
      });
    }
  }
}
