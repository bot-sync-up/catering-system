/**
 * Extractor: לידים (Lead) — מהמודול הישן CRM.
 *
 * הסכמה הישנה:
 *   model Lead { id cuid, source LeadSource, status LeadStatus,
 *     name, email?, phone?, message?, customerId? (לפעמים כבר הומר ללקוח),
 *     value Float (LTV מוערך), assignedToId?, ... }
 */

import type { Pool } from "pg";
import { wrap, type Extractor } from "./base.js";
import type { ExtractedRecord } from "../types.js";

export interface CrmLeadRow {
  id: string;
  source: string;
  status: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  value: number;
  customerId: string | null;
  assignedToId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class LeadsFromCrmExtractor implements Extractor<CrmLeadRow> {
  readonly sourceModule = "crm" as const;
  readonly sourceTable = "Lead";
  readonly targetModelHint = "Lead";

  constructor(private readonly pool: Pool) {}

  async *extract(opts: { batchId: string; limit?: number }): AsyncIterable<ExtractedRecord<CrmLeadRow>> {
    const sql = `
      SELECT id, source::text AS source, status::text AS status,
             name, email, phone, message, value,
             "customerId", "assignedToId", "createdAt", "updatedAt"
      FROM "Lead"
      ORDER BY "createdAt" ASC
      ${opts.limit ? `LIMIT ${opts.limit}` : ""}
    `;
    const result = await this.pool.query(sql);
    for (const raw of result.rows as CrmLeadRow[]) {
      yield wrap(raw, {
        sourceModule: this.sourceModule,
        sourceTable: this.sourceTable,
        originalId: raw.id,
        batchId: opts.batchId,
      });
    }
  }
}
