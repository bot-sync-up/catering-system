/**
 * COGS לאירוע — Ingredients + Labor + Overhead allocation → רווחיות + שולי רווח
 *
 * Ingredients:
 *   - InventoryMovement(type=OUT) שמפנה לאירוע ע"י reference == event.id
 *   - אם reference חסר — fallback ל-recipe-based estimation:
 *       לכל OrderItem עם recipeId: sum(quantity * recipeIngredient.quantity * product.unitCost)
 *
 * Labor:
 *   sum(TimeEntry.totalMins/60 * StaffAssignment.hourlyRate) עבור הassignments של אותו אירוע
 *   (matching לפי employeeId + טווח זמן השיבוץ).
 *   Fallback: StaffAssignment בלבד אם אין TimeEntry.
 *
 * Overhead:
 *   חודשי Opex (Expense+Payroll OFFICIAL) ÷ סך אירועים באותו חודש × event allocation factor
 *   factor = guestCount(event) / sum(guestCount(events in month))
 */
import { Decimal } from "decimal.js";
import { startOfMonth, endOfMonth } from "date-fns";
import type { EventProfitability, TenantScope, DateRange } from "../types.js";
import { getPrisma } from "../utils/prisma.js";
import { pct, sumDecimals, toDecimal } from "../utils/decimal.js";

export interface CogsPerEventOptions extends TenantScope {
  range: DateRange;
}

export async function buildCogsPerEvent(opts: CogsPerEventOptions): Promise<EventProfitability[]> {
  const prisma = getPrisma();
  const { tenantId, range } = opts;

  // === Events in range ===
  const events = await prisma.event.findMany({
    where: {
      tenantId,
      status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
      startsAt: { gte: range.from, lte: range.to },
    },
    select: {
      id: true,
      title: true,
      startsAt: true,
      guestCount: true,
      totalPrice: true,
      orderItems: {
        select: {
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          productId: true,
          recipeId: true,
          product: { select: { unitCost: true } },
          recipe: {
            select: {
              servings: true,
              ingredients: {
                select: {
                  quantity: true,
                  product: { select: { unitCost: true } },
                },
              },
            },
          },
        },
      },
      staffAssignments: {
        select: {
          employeeId: true,
          hourlyRate: true,
          startsAt: true,
          endsAt: true,
        },
      },
    },
  });

  if (events.length === 0) return [];

  // === Direct ingredient costs from InventoryMovements (reference=event.id) ===
  const eventIds = events.map((e) => e.id);
  const directMovements = await prisma.inventoryMovement.findMany({
    where: {
      tenantId,
      type: { in: ["OUT", "WASTE"] },
      reference: { in: eventIds },
    },
    select: {
      reference: true,
      quantity: true,
      unitCost: true,
      product: { select: { unitCost: true } },
    },
  });
  const directByEvent = new Map<string, Decimal>();
  for (const m of directMovements) {
    if (!m.reference) continue;
    const unitCost = toDecimal(m.unitCost ?? m.product?.unitCost ?? 0);
    const qty = toDecimal(m.quantity).abs();
    directByEvent.set(
      m.reference,
      (directByEvent.get(m.reference) ?? new Decimal(0)).plus(qty.mul(unitCost)),
    );
  }

  // === Labor costs — TimeEntry × assignment.hourlyRate ===
  const allAssignments = events.flatMap((e) =>
    e.staffAssignments.map((a) => ({ ...a, eventId: e.id })),
  );
  const employeeIds = [
    ...new Set(allAssignments.map((a) => a.employeeId).filter((x): x is string => !!x)),
  ];
  const timeEntries = employeeIds.length
    ? await prisma.timeEntry.findMany({
        where: {
          tenantId,
          employeeId: { in: employeeIds },
          clockIn: { gte: range.from, lte: range.to },
        },
        select: {
          employeeId: true,
          clockIn: true,
          clockOut: true,
          totalMins: true,
        },
      })
    : [];

  const laborByEvent = new Map<string, Decimal>();
  for (const ev of events) {
    let cost = new Decimal(0);
    for (const a of ev.staffAssignments) {
      const rate = toDecimal(a.hourlyRate ?? 0);
      // מצא timeEntries של אותו עובד בחלון השיבוץ
      const matching = timeEntries.filter(
        (t) =>
          t.employeeId === a.employeeId &&
          t.clockIn.getTime() >= a.startsAt.getTime() &&
          t.clockIn.getTime() <= a.endsAt.getTime(),
      );
      let mins = 0;
      if (matching.length > 0) {
        mins = matching.reduce((acc, t) => acc + (t.totalMins ?? 0), 0);
      } else {
        // fallback: assignment duration
        mins = Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60_000);
      }
      cost = cost.plus(rate.mul(mins).div(60));
    }
    laborByEvent.set(ev.id, cost);
  }

  // === Overhead allocation ===
  // לכל חודש: opex חודשי / total guestCount של אירועים באותו חודש → cost per guest
  const monthKey = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  const guestCountByMonth = new Map<string, number>();
  for (const ev of events) {
    const k = monthKey(ev.startsAt);
    guestCountByMonth.set(k, (guestCountByMonth.get(k) ?? 0) + ev.guestCount);
  }

  const opexByMonth = new Map<string, Decimal>();
  for (const k of guestCountByMonth.keys()) {
    const [yStr, mStr] = k.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    const start = startOfMonth(new Date(Date.UTC(y, m - 1, 1)));
    const end = endOfMonth(start);
    const [expenses, payroll] = await Promise.all([
      prisma.expense.findMany({
        where: {
          tenantId,
          category: "OFFICIAL",
          occurredAt: { gte: start, lte: end },
        },
        select: { amount: true },
      }),
      prisma.payrollRecord.findMany({
        where: {
          tenantId,
          category: "OFFICIAL",
          periodStart: { gte: start, lte: end },
        },
        select: { netPay: true },
      }),
    ]);
    const total = sumDecimals([
      ...expenses.map((e) => e.amount),
      ...payroll.map((p) => p.netPay),
    ]);
    opexByMonth.set(k, total);
  }

  // === Build profitability rows ===
  const rows: EventProfitability[] = events.map((ev) => {
    // ingredients
    let ingredientsCost = directByEvent.get(ev.id);
    if (!ingredientsCost || ingredientsCost.isZero()) {
      // recipe-based estimation
      let est = new Decimal(0);
      for (const oi of ev.orderItems) {
        if (oi.recipe && oi.recipe.servings > 0) {
          const factor = toDecimal(oi.quantity).div(oi.recipe.servings);
          for (const ing of oi.recipe.ingredients) {
            est = est.plus(
              toDecimal(ing.quantity).mul(factor).mul(toDecimal(ing.product.unitCost ?? 0)),
            );
          }
        } else if (oi.productId && oi.product) {
          est = est.plus(toDecimal(oi.quantity).mul(toDecimal(oi.product.unitCost ?? 0)));
        }
      }
      ingredientsCost = est;
    }

    const laborCost = laborByEvent.get(ev.id) ?? new Decimal(0);

    // overhead
    const k = monthKey(ev.startsAt);
    const monthOpex = opexByMonth.get(k) ?? new Decimal(0);
    const totalGuests = guestCountByMonth.get(k) ?? 0;
    const overheadCost =
      totalGuests > 0 && ev.guestCount > 0
        ? monthOpex.mul(ev.guestCount).div(totalGuests)
        : new Decimal(0);

    const totalCogs = ingredientsCost.plus(laborCost).plus(overheadCost);
    const revenue = toDecimal(ev.totalPrice);
    const grossProfit = revenue.minus(totalCogs);

    return {
      eventId: ev.id,
      eventTitle: ev.title,
      startsAt: ev.startsAt,
      guestCount: ev.guestCount,
      revenue,
      ingredientsCost,
      laborCost,
      overheadCost,
      totalCogs,
      grossProfit,
      marginPct: pct(grossProfit, revenue),
    };
  });

  return rows.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
}
