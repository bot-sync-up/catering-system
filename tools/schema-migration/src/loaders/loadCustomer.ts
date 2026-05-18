/**
 * Loader: Customer חדש.
 * משתמש ב־upsert על (tenantId, taxId) אם יש, אחרת על id דטרמיניסטי.
 */

import type { LoaderOptions, Loader } from "./base.js";
import { shouldOverwrite } from "./base.js";
import type { LoadResult, TransformedRecord } from "../types.js";
import type { NewCustomerData } from "../transformers/transformCustomer.js";
import { log } from "../util/logger.js";

export class CustomerLoader implements Loader<NewCustomerData> {
  readonly targetModel = "Customer";

  async load(
    rec: TransformedRecord<NewCustomerData>,
    opts: LoaderOptions,
  ): Promise<LoadResult> {
    const { prisma, dryRun } = opts;
    const { data } = rec;
    if (dryRun) {
      log.debug(`[dry-run] Customer ${data.id} (${data.displayName})`);
      return {
        __meta: rec.__meta,
        targetModel: "Customer",
        newId: data.id,
        action: "skipped",
      };
    }

    try {
      // נסה למצוא רשומה קיימת לפי upsertKey (tenantId+taxId/email) כדי למזג.
      const customerModel = (prisma as unknown as { customer: PrismaModel })
        .customer;

      const existing = data.taxId
        ? await customerModel.findFirst({
            where: { tenantId: data.tenantId, taxId: data.taxId },
          })
        : data.email
          ? await customerModel.findFirst({
              where: { tenantId: data.tenantId, email: data.email },
            })
          : await customerModel.findUnique({ where: { id: data.id } });

      if (existing) {
        if (!shouldOverwrite(existing.updatedAt as Date | null, data.updatedAt)) {
          return {
            __meta: rec.__meta,
            targetModel: "Customer",
            newId: existing.id,
            action: "skipped",
          };
        }
        const updated = await customerModel.update({
          where: { id: existing.id },
          data: {
            displayName: data.displayName,
            companyName: data.companyName,
            email: data.email,
            phone: data.phone,
            website: data.website,
            notes: data.notes,
            churnScore: data.churnScore,
            upsellScore: data.upsellScore,
            ltv: data.ltv,
            lastContactAt: data.lastContactAt,
            updatedAt: data.updatedAt,
          },
        });
        return {
          __meta: rec.__meta,
          targetModel: "Customer",
          newId: updated.id,
          action: "updated",
        };
      }

      const created = await customerModel.create({ data });
      return {
        __meta: rec.__meta,
        targetModel: "Customer",
        newId: created.id,
        action: "inserted",
      };
    } catch (err) {
      return {
        __meta: rec.__meta,
        targetModel: "Customer",
        newId: data.id,
        action: "skipped",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/** Prisma model interface מינימלי — מאפשר טיפוס מבלי לתלות ב־generate. */
interface PrismaModel {
  findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string; updatedAt?: Date } | null>;
  findUnique(args: { where: { id: string } }): Promise<{ id: string; updatedAt?: Date } | null>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string }>;
  create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
}
