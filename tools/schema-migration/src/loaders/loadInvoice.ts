/**
 * Loader: Invoice חדש.
 *
 * upsert על (tenantId, invoiceNum). אם הסכום הכולל שונה — מתעדכן.
 */

import type { LoaderOptions, Loader } from "./base.js";
import { shouldOverwrite } from "./base.js";
import type { LoadResult, TransformedRecord } from "../types.js";
import type { NewInvoiceData } from "../transformers/transformInvoice.js";

export class InvoiceLoader implements Loader<NewInvoiceData> {
  readonly targetModel = "Invoice";

  async load(
    rec: TransformedRecord<NewInvoiceData>,
    opts: LoaderOptions,
  ): Promise<LoadResult> {
    const { prisma, dryRun } = opts;
    const { data } = rec;
    if (dryRun) {
      return {
        __meta: rec.__meta,
        targetModel: "Invoice",
        newId: data.id,
        action: "skipped",
      };
    }

    try {
      const invoiceModel = (prisma as unknown as { invoice: InvoiceModel }).invoice;
      const existing = await invoiceModel.findFirst({
        where: { tenantId: data.tenantId, invoiceNum: data.invoiceNum },
      });

      if (existing) {
        if (!shouldOverwrite(existing.updatedAt, data.updatedAt)) {
          return {
            __meta: rec.__meta,
            targetModel: "Invoice",
            newId: existing.id,
            action: "skipped",
          };
        }
        const updated = await invoiceModel.update({
          where: { id: existing.id },
          data: {
            status: data.status,
            category: data.category,
            amount: data.amount,
            vatRate: data.vatRate,
            taxAmount: data.taxAmount,
            totalAmount: data.totalAmount,
            paidAmount: data.paidAmount,
            issuedAt: data.issuedAt,
            dueAt: data.dueAt,
            notes: data.notes,
            updatedAt: data.updatedAt,
          },
        });
        return {
          __meta: rec.__meta,
          targetModel: "Invoice",
          newId: updated.id,
          action: "updated",
        };
      }

      const created = await invoiceModel.create({ data });
      return {
        __meta: rec.__meta,
        targetModel: "Invoice",
        newId: created.id,
        action: "inserted",
      };
    } catch (err) {
      return {
        __meta: rec.__meta,
        targetModel: "Invoice",
        newId: data.id,
        action: "skipped",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

interface InvoiceModel {
  findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string; updatedAt: Date } | null>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string }>;
  create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
}
