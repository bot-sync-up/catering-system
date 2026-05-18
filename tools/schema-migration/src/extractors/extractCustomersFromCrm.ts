/**
 * Extractor: לקוחות (CRM) — מהמודול הישן `agent-ad2220241a52022d0/prisma`.
 *
 * הסכמה הישנה:
 *   model Customer { id cuid, type, status, displayName, companyName,
 *     taxId, email, phone, website, notes, churnScore Float, upsellScore Float,
 *     ltv Float, lastContact DateTime?, accountManagerId, ... }
 *
 * אנחנו מחלצים את כל השדות הרלוונטיים. ContactPerson + Address + Tag
 * נחלצים בנפרד (extractors משלהם), אבל ה־taxId/email/phone של ה־Customer
 * הם מה שמשמש את ה־dedup.
 */

import type { Pool } from "pg";
import { wrap, type Extractor } from "./base.js";
import type { ExtractedRecord } from "../types.js";

export interface CrmCustomerRow {
  id: string;
  type: string;
  status: string;
  displayName: string;
  companyName: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  churnScore: number;
  upsellScore: number;
  ltv: number;
  lastContact: Date | null;
  accountManagerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CustomersFromCrmExtractor implements Extractor<CrmCustomerRow> {
  readonly sourceModule = "crm" as const;
  readonly sourceTable = "Customer";
  readonly targetModelHint = "Customer";

  constructor(private readonly pool: Pool) {}

  async *extract(opts: { batchId: string; limit?: number }): AsyncIterable<ExtractedRecord<CrmCustomerRow>> {
    const sql = `
      SELECT id, type::text AS type, status::text AS status,
             "displayName", "companyName", "taxId", email, phone, website, notes,
             "churnScore", "upsellScore", ltv, "lastContact",
             "accountManagerId", "createdAt", "updatedAt"
      FROM "Customer"
      ORDER BY "createdAt" ASC
      ${opts.limit ? `LIMIT ${opts.limit}` : ""}
    `;
    const result = await this.pool.query(sql);
    for (const raw of result.rows as CrmCustomerRow[]) {
      yield wrap(raw, {
        sourceModule: this.sourceModule,
        sourceTable: this.sourceTable,
        originalId: raw.id,
        batchId: opts.batchId,
      });
    }
  }
}
