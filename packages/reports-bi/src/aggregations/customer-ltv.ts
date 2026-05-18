/**
 * Customer Lifetime Value (LTV)
 *
 * נוסחה:
 *   avgEventValue = totalRevenue / totalEvents
 *   eventsPerYear = totalEvents / (lifespanDays / 365)
 *   predictedLtv  = avgEventValue * eventsPerYear * EXPECTED_RETENTION_YEARS
 *
 * EXPECTED_RETENTION_YEARS = 3 (קייטרינג: חתונה לבן/בת, אירועי משפחה).
 */
import { Decimal } from "decimal.js";
import type { CustomerLtvRow, TenantScope, DateRange } from "../types.js";
import { getPrisma } from "../utils/prisma.js";
import { sumDecimals, toDecimal } from "../utils/decimal.js";
import { daysBetween } from "../utils/dates.js";

const EXPECTED_RETENTION_YEARS = 3;

export interface CustomerLtvOptions extends TenantScope {
  range: DateRange;
  /** הגבל לקוחות לרשימה ספציפית */
  customerIds?: string[];
}

export async function buildCustomerLtv(opts: CustomerLtvOptions): Promise<CustomerLtvRow[]> {
  const prisma = getPrisma();
  const { tenantId, range, customerIds } = opts;

  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(customerIds ? { id: { in: customerIds } } : {}),
    },
    select: {
      id: true,
      name: true,
      hebrewName: true,
      events: {
        where: {
          status: { in: ["COMPLETED", "IN_PROGRESS", "CONFIRMED"] },
          startsAt: { gte: range.from, lte: range.to },
        },
        select: {
          startsAt: true,
          payments: {
            where: { status: "PAID", category: "OFFICIAL" },
            select: { amount: true },
          },
        },
      },
    },
  });

  const today = new Date();
  const rows: CustomerLtvRow[] = customers
    .map((c) => {
      const totalEvents = c.events.length;
      if (totalEvents === 0) {
        return {
          customerId: c.id,
          customerName: c.hebrewName ?? c.name,
          firstEventAt: null,
          lastEventAt: null,
          totalEvents: 0,
          totalRevenue: new Decimal(0),
          avgEventValue: new Decimal(0),
          lifespanDays: 0,
          predictedLtv: new Decimal(0),
        };
      }
      const eventDates = c.events.map((e) => e.startsAt).sort((a, b) => a.getTime() - b.getTime());
      const firstEventAt = eventDates[0]!;
      const lastEventAt = eventDates[eventDates.length - 1]!;
      const totalRevenue = sumDecimals(
        c.events.flatMap((e) => e.payments.map((p) => toDecimal(p.amount))),
      );
      const avgEventValue = totalEvents > 0 ? totalRevenue.div(totalEvents) : new Decimal(0);
      const lifespanDays = Math.max(1, daysBetween(firstEventAt, today));
      const eventsPerYear = (totalEvents * 365) / lifespanDays;
      const predictedLtv = avgEventValue.mul(eventsPerYear).mul(EXPECTED_RETENTION_YEARS);
      return {
        customerId: c.id,
        customerName: c.hebrewName ?? c.name,
        firstEventAt,
        lastEventAt,
        totalEvents,
        totalRevenue,
        avgEventValue,
        lifespanDays,
        predictedLtv,
      };
    })
    .filter((r) => r.totalEvents > 0)
    .sort((a, b) => b.predictedLtv.cmp(a.predictedLtv));

  return rows;
}
