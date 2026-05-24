/**
 * חשבוניות עם מספרי הקצאה ישראליים — 2026-XXXXXX.
 * רק לאירועים COMPLETED + חלק מ-IN_PROGRESS.
 */
import { did } from "../utils/ids.js";
import { invoiceNumber, vatAmount, round2, VAT_RATE } from "../utils/money.js";
import { daysAgo } from "../utils/dates.js";
import { randInt } from "../utils/rng.js";
import type { SeedContext } from "../context.js";
import type { SeededEvent } from "./events.js";

export interface SeededInvoice {
  id: string;
  eventId: string;
  customerId: string;
  totalAmount: number;
  paidAmount: number;
  status: "PAID" | "SENT" | "PARTIALLY_PAID";
}

export async function seedInvoices(
  ctx: SeedContext,
  events: SeededEvent[],
): Promise<SeededInvoice[]> {
  const { prisma, tenantId } = ctx;
  const out: SeededInvoice[] = [];
  let seq = 1;

  for (const event of events) {
    // ליצור invoice רק לאירועים שעברו את שלב טיוטה
    if (event.status === "DRAFT" || event.status === "CANCELLED") continue;

    const isCompleted = event.status === "COMPLETED";
    const isPartial = event.status === "IN_PROGRESS" || event.status === "CONFIRMED";
    if (!isCompleted && !isPartial) continue;

    const netAmount = round2(event.totalPrice / (1 + VAT_RATE / 100));
    const tax = vatAmount(netAmount);
    const totalAmount = round2(netAmount + tax);
    const paidAmount = isCompleted ? totalAmount : (isPartial ? round2(totalAmount * 0.5) : 0);
    const status: SeededInvoice["status"] = isCompleted ? "PAID" : "PARTIALLY_PAID";

    const id = did(`invoice:${tenantId}:${event.id}`);
    const invoiceNum = invoiceNumber(event.startsAt.getFullYear(), seq++);
    const issuedAt = isCompleted ? new Date(event.endsAt) : daysAgo(randInt(7, 30));

    await prisma.invoice.upsert({
      where: { id },
      update: { status, paidAmount: paidAmount as any },
      create: {
        id,
        tenantId,
        customerId: event.customerId,
        eventId: event.id,
        invoiceNum,
        category: "OFFICIAL",
        status,
        amount: netAmount as any,
        vatRate: VAT_RATE as any,
        taxAmount: tax as any,
        discount: 0 as any,
        totalAmount: totalAmount as any,
        paidAmount: paidAmount as any,
        currency: "ILS",
        issuedAt,
        dueAt: new Date(issuedAt.getTime() + 30 * 86_400_000),
        paidAt: isCompleted ? issuedAt : null,
        items: [
          {
            description: `שירותי קייטרינג - ${event.guestCount} אורחים`,
            quantity: event.guestCount,
            unitPrice: round2(netAmount / event.guestCount),
            total: netAmount,
          },
        ] as any,
        notes: "תודה על שיתוף הפעולה!",
      },
    });

    out.push({ id, eventId: event.id, customerId: event.customerId, totalAmount, paidAmount, status });
  }

  return out;
}
