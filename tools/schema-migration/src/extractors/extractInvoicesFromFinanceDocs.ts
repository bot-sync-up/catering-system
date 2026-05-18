/**
 * Extractor: חשבוניות (Invoice) — מהמודול הישן `agent-a31b566159e7cc878/finance-docs/prisma`.
 *
 * הסכמה הישנה:
 *   model Document { id, orgId, customerId, type DocType, tag DocTag (OFFICIAL/UNOFFICIAL),
 *     status, number, issueDate, dueDate?, currency,
 *     subtotal Decimal(14,2), vatRate Decimal(5,4) (e.g. 0.17 / 0.18),
 *     vatAmount Decimal(14,2), total Decimal(14,2), paidAmount Decimal(14,2),
 *     balance Decimal(14,2), notes?, pdfPath?, parentId?, ... }
 *
 * חשוב: רק `type = INVOICE` ממופה ל־Invoice החדש. סוגים אחרים (RECEIPT, CREDIT_NOTE,
 * QUOTE) ימופו ל־Receipt או ל־Document בנפרד — לא נחלצים פה.
 */

import type { Pool } from "pg";
import { wrap, type Extractor } from "./base.js";
import type { ExtractedRecord } from "../types.js";

export interface FinanceDocsInvoiceRow {
  id: string;
  orgId: string;
  customerId: string;
  type: string;
  tag: "OFFICIAL" | "UNOFFICIAL";
  status: string;
  number: string;
  issueDate: Date;
  dueDate: Date | null;
  currency: string;
  subtotal: string;
  vatRate: string;
  vatAmount: string;
  total: string;
  paidAmount: string;
  balance: string;
  notes: string | null;
  pdfPath: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class InvoicesFromFinanceDocsExtractor implements Extractor<FinanceDocsInvoiceRow> {
  readonly sourceModule = "finance-docs" as const;
  readonly sourceTable = "Document";
  readonly targetModelHint = "Invoice";

  constructor(private readonly pool: Pool) {}

  async *extract(opts: {
    batchId: string;
    limit?: number;
  }): AsyncIterable<ExtractedRecord<FinanceDocsInvoiceRow>> {
    const sql = `
      SELECT id, "orgId", "customerId", type::text AS type, tag::text AS tag,
             status::text AS status, number, "issueDate", "dueDate", currency,
             subtotal::text AS subtotal, "vatRate"::text AS "vatRate",
             "vatAmount"::text AS "vatAmount", total::text AS total,
             "paidAmount"::text AS "paidAmount", balance::text AS balance,
             notes, "pdfPath", "parentId", "createdAt", "updatedAt"
      FROM "Document"
      WHERE type = 'INVOICE'
      ORDER BY "issueDate" ASC
      ${opts.limit ? `LIMIT ${opts.limit}` : ""}
    `;
    const result = await this.pool.query(sql);
    for (const raw of result.rows as FinanceDocsInvoiceRow[]) {
      yield wrap(raw, {
        sourceModule: this.sourceModule,
        sourceTable: this.sourceTable,
        originalId: raw.id,
        batchId: opts.batchId,
      });
    }
  }
}
