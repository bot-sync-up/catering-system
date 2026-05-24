/**
 * תשלומים — Cardcom / iCount / העברה בנקאית / מזומן / Bit.
 * עם reference חיצוני אמיתי.
 */
import type { PaymentMethod } from "@prisma/client";
import { did } from "../utils/ids.js";
import { randInt, pick, chance } from "../utils/rng.js";
import { receiptNumber, round2 } from "../utils/money.js";
import { daysAgo } from "../utils/dates.js";
import type { SeedContext } from "../context.js";
import type { SeededInvoice } from "./invoices.js";

const METHODS: PaymentMethod[] = ["CREDIT_CARD", "BANK_TRANSFER", "CASH", "CHECK", "BIT"];

function randomReference(method: PaymentMethod): string {
  switch (method) {
    case "CREDIT_CARD":
      return `cardcom-${randInt(1000000, 9999999)}`;
    case "BANK_TRANSFER":
      return `icount-${randInt(100000, 999999)}`;
    case "CASH":
      return `cash-${randInt(1000, 9999)}`;
    case "CHECK":
      return `chk-${randInt(100000, 999999)}`;
    case "BIT":
      return `bit-${randInt(1000000, 9999999)}`;
    default:
      return `ref-${randInt(1000, 9999)}`;
  }
}

export async function seedPayments(
  ctx: SeedContext,
  invoices: SeededInvoice[],
): Promise<void> {
  const { prisma, tenantId } = ctx;
  let recSeq = 1;

  for (const inv of invoices) {
    if (inv.paidAmount <= 0) continue;

    // לפעמים מפצלים לשני תשלומים
    const splits = chance(0.3) ? 2 : 1;
    const splitAmount = round2(inv.paidAmount / splits);

    for (let s = 0; s < splits; s++) {
      const method = pick(METHODS);
      const amount = s === splits - 1 ? round2(inv.paidAmount - splitAmount * (splits - 1)) : splitAmount;
      const paidAt = daysAgo(randInt(1, 60));
      const id = did(`payment:${inv.id}:${s}`);

      await prisma.payment.upsert({
        where: { id },
        update: {},
        create: {
          id,
          tenantId,
          customerId: inv.customerId,
          eventId: inv.eventId,
          invoiceId: inv.id,
          method,
          status: "COMPLETED",
          category: chance(0.85) ? "OFFICIAL" : "UNOFFICIAL",
          amount: amount as any,
          currency: "ILS",
          reference: randomReference(method),
          paidAt,
          notes: `תשלום ${s + 1}/${splits} חשבונית`,
        },
      });

      // קבלה
      const receiptId = did(`receipt:${inv.id}:${s}`);
      await prisma.receipt.upsert({
        where: { id: receiptId },
        update: {},
        create: {
          id: receiptId,
          tenantId,
          invoiceId: inv.id,
          customerId: inv.customerId,
          receiptNum: receiptNumber(paidAt.getFullYear(), recSeq++),
          category: "OFFICIAL",
          amount: amount as any,
          currency: "ILS",
          method,
          issuedAt: paidAt,
        },
      });
    }
  }
}
