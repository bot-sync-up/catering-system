/**
 * Loader: Event חדש (מהזמנות).
 */

import type { LoaderOptions, Loader } from "./base.js";
import { shouldOverwrite } from "./base.js";
import type { LoadResult, TransformedRecord } from "../types.js";
import type { NewEventData } from "../transformers/transformOrder.js";

export class OrderLoader implements Loader<NewEventData> {
  readonly targetModel = "Event";

  async load(
    rec: TransformedRecord<NewEventData>,
    opts: LoaderOptions,
  ): Promise<LoadResult> {
    const { prisma, dryRun } = opts;
    const { data } = rec;
    if (dryRun) {
      return {
        __meta: rec.__meta,
        targetModel: "Event",
        newId: data.id,
        action: "skipped",
      };
    }
    try {
      const eventModel = (prisma as unknown as { event: EventModel }).event;
      const existing = await eventModel.findFirst({
        where: { tenantId: data.tenantId, eventNumber: data.eventNumber },
      });

      if (existing) {
        if (!shouldOverwrite(existing.updatedAt, data.updatedAt)) {
          return {
            __meta: rec.__meta,
            targetModel: "Event",
            newId: existing.id,
            action: "skipped",
          };
        }
        const updated = await eventModel.update({
          where: { id: existing.id },
          data: {
            status: data.status,
            eventDate: data.eventDate,
            eventLocation: data.eventLocation,
            guestCount: data.guestCount,
            basePrice: data.basePrice,
            taxAmount: data.taxAmount,
            totalPrice: data.totalPrice,
            customerNotes: data.customerNotes,
            internalNotes: data.internalNotes,
            updatedAt: data.updatedAt,
          },
        });
        return {
          __meta: rec.__meta,
          targetModel: "Event",
          newId: updated.id,
          action: "updated",
        };
      }

      const created = await eventModel.create({ data });
      return {
        __meta: rec.__meta,
        targetModel: "Event",
        newId: created.id,
        action: "inserted",
      };
    } catch (err) {
      return {
        __meta: rec.__meta,
        targetModel: "Event",
        newId: data.id,
        action: "skipped",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

interface EventModel {
  findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string; updatedAt: Date } | null>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string }>;
  create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
}
