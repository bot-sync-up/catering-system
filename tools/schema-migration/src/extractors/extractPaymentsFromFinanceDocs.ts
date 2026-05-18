/**
 * Extractor: תשלומים (Payment) — מהמודול הישן finance-docs.
 *
 * הסכמה הישנה:
 *   model Payment { id, documentId, amount Decimal(14,2), method PaymentMethod,
 *     paidAt, reference?, notes?, createdAt }
 */

import type { Pool } from "pg";
import { wrap, type Extractor } from "./base.js";
import type { ExtractedRecord } from "../types.js";

export interface FinancePaymentRow {
  id: string;
  documentId: string;
  amount: string;
  method: string;
  paidAt: Date;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
}

export class PaymentsFromFinanceDocsExtractor implements Extractor<FinancePaymentRow> {
  readonly sourceModule = "finance-docs" as const;
  readonly sourceTable = "Payment";
  readonly targetModelHint = "Payment";

  constructor(private readonly pool: Pool) {}

  async *extract(opts: { batchId: string; limit?: number }): AsyncIterable<ExtractedRecord<FinancePaymentRow>> {
    const sql = `
      SELECT id, "documentId", amount::text AS amount, method::text AS method,
             "paidAt", reference, notes, "createdAt"
      FROM "Payment"
      ORDER BY "paidAt" ASC
      ${opts.limit ? `LIMIT ${opts.limit}` : ""}
    `;
    const result = await this.pool.query(sql);
    for (const raw of result.rows as FinancePaymentRow[]) {
      yield wrap(raw, {
        sourceModule: this.sourceModule,
        sourceTable: this.sourceTable,
        originalId: raw.id,
        batchId: opts.batchId,
      });
    }
  }
}
