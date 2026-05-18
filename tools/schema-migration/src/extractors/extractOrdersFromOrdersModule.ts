/**
 * Extractor: הזמנות (Orders) — מהמודול הישן `agent-a3864f31565b63390/prisma`.
 *
 * הסכמה הישנה:
 *   model Order { id, orderNumber unique, type, status, channel, customerId,
 *     eventDate?, eventLocation?, guestCount?, subscriptionId?,
 *     subtotal Float, taxAmount Float, totalAmount Float,
 *     customerNotes?, internalNotes?, approvedById?, approvedAt?,
 *     rejectedReason?, createdAt, updatedAt }
 *
 * הסכמה החדשה ממפה Order → Event (לאירועים) + OrderItems נפרדים.
 * כאן אנחנו מחלצים את ה־header (Order) ו־`extractOrderItems` חולץ את הפריטים.
 */

import type { Pool } from "pg";
import { wrap, type Extractor } from "./base.js";
import type { ExtractedRecord } from "../types.js";

export interface OrdersOrderRow {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  channel: string;
  customerId: string;
  eventDate: Date | null;
  eventLocation: string | null;
  guestCount: number | null;
  subscriptionId: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  customerNotes: string | null;
  internalNotes: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
  rejectedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class OrdersFromOrdersModuleExtractor implements Extractor<OrdersOrderRow> {
  readonly sourceModule = "orders" as const;
  readonly sourceTable = "Order";
  readonly targetModelHint = "Event";

  constructor(private readonly pool: Pool) {}

  async *extract(opts: { batchId: string; limit?: number }): AsyncIterable<ExtractedRecord<OrdersOrderRow>> {
    const sql = `
      SELECT id, "orderNumber", type::text AS type, status::text AS status,
             channel::text AS channel, "customerId", "eventDate", "eventLocation",
             "guestCount", "subscriptionId", subtotal, "taxAmount", "totalAmount",
             "customerNotes", "internalNotes", "approvedById", "approvedAt",
             "rejectedReason", "createdAt", "updatedAt"
      FROM "Order"
      ORDER BY "createdAt" ASC
      ${opts.limit ? `LIMIT ${opts.limit}` : ""}
    `;
    const result = await this.pool.query(sql);
    for (const raw of result.rows as OrdersOrderRow[]) {
      yield wrap(raw, {
        sourceModule: this.sourceModule,
        sourceTable: this.sourceTable,
        originalId: raw.id,
        batchId: opts.batchId,
      });
    }
  }
}
