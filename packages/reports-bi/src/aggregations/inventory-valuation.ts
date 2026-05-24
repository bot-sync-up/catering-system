/**
 * Inventory Valuation — FIFO end-of-year
 *
 * אלגוריתם FIFO לכל מוצר:
 *   - מסדר את כל ה-IN/RETURN/ADJUSTMENT(+) movements לפי occurredAt.
 *   - מסדר את כל ה-OUT/WASTE/CONSUME לפי occurredAt.
 *   - "מחסל" כל OUT מהלוט הוותיק ביותר.
 *   - הלוטים הנותרים = המלאי בסוף השנה.
 *
 * הערכים נשמרים ב-unit_cost ההיסטורי של ה-IN movement (אם חסר — product.unitCost).
 *
 * שימוש: דוח שנתי לרשויות מס + מאזן שנתי.
 */
import { Decimal } from "decimal.js";
import type { InventoryLot, InventoryValuation, TenantScope } from "../types.js";
import { getPrisma } from "../utils/prisma.js";
import { toDecimal } from "../utils/decimal.js";

export interface InventoryValuationOptions extends TenantScope {
  /** תאריך הצילום — בדרך כלל 31/12 */
  asOf: Date;
}

export async function buildInventoryValuation(
  opts: InventoryValuationOptions,
): Promise<InventoryValuation[]> {
  const prisma = getPrisma();
  const { tenantId, asOf } = opts;

  const products = await prisma.product.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    select: { id: true, name: true, hebrewName: true, unitCost: true },
  });

  if (products.length === 0) return [];

  const productIds = products.map((p) => p.id);
  const movements = await prisma.inventoryMovement.findMany({
    where: {
      tenantId,
      productId: { in: productIds },
      occurredAt: { lte: asOf },
    },
    orderBy: { occurredAt: "asc" },
    select: {
      productId: true,
      type: true,
      quantity: true,
      unitCost: true,
      occurredAt: true,
    },
  });

  // קיבוץ לפי מוצר
  const byProduct = new Map<string, typeof movements>();
  for (const m of movements) {
    const list = byProduct.get(m.productId) ?? [];
    list.push(m);
    byProduct.set(m.productId, list);
  }

  const result: InventoryValuation[] = [];
  for (const p of products) {
    const ms = byProduct.get(p.id) ?? [];
    if (ms.length === 0) continue;

    // FIFO queue של לוטים פתוחים
    const lots: InventoryLot[] = [];
    const fallbackCost = toDecimal(p.unitCost);

    for (const m of ms) {
      const qty = toDecimal(m.quantity).abs();
      const isInbound = m.type === "IN" || m.type === "RETURN" || m.type === "TRANSFER";
      if (isInbound) {
        lots.push({
          productId: p.id,
          quantity: qty,
          unitCost: toDecimal(m.unitCost ?? fallbackCost),
          acquiredAt: m.occurredAt,
        });
      } else if (m.type === "OUT" || m.type === "WASTE") {
        // צרוך מ-FIFO
        let remaining = qty;
        while (remaining.gt(0) && lots.length > 0) {
          const first = lots[0]!;
          if (first.quantity.lte(remaining)) {
            remaining = remaining.minus(first.quantity);
            lots.shift();
          } else {
            first.quantity = first.quantity.minus(remaining);
            remaining = new Decimal(0);
          }
        }
        // אם remaining > 0 → גירעון; מתעלמים (לא יוצרים לוט שלילי)
      } else if (m.type === "ADJUSTMENT") {
        // התאמה: אם חיובי = inbound; אם שלילי = outbound
        const raw = toDecimal(m.quantity);
        if (raw.gt(0)) {
          lots.push({
            productId: p.id,
            quantity: raw,
            unitCost: toDecimal(m.unitCost ?? fallbackCost),
            acquiredAt: m.occurredAt,
          });
        } else if (raw.lt(0)) {
          let remaining = raw.abs();
          while (remaining.gt(0) && lots.length > 0) {
            const first = lots[0]!;
            if (first.quantity.lte(remaining)) {
              remaining = remaining.minus(first.quantity);
              lots.shift();
            } else {
              first.quantity = first.quantity.minus(remaining);
              remaining = new Decimal(0);
            }
          }
        }
      }
    }

    const totalQuantity = lots.reduce((acc, l) => acc.plus(l.quantity), new Decimal(0));
    const totalValue = lots.reduce(
      (acc, l) => acc.plus(l.quantity.mul(l.unitCost)),
      new Decimal(0),
    );
    const weightedAvgCost = totalQuantity.isZero()
      ? new Decimal(0)
      : totalValue.div(totalQuantity);

    if (!totalQuantity.isZero()) {
      result.push({
        productId: p.id,
        productName: p.hebrewName ?? p.name,
        totalQuantity,
        totalValue,
        weightedAvgCost,
        lots,
      });
    }
  }

  return result.sort((a, b) => b.totalValue.cmp(a.totalValue));
}

export function totalInventoryValue(valuations: InventoryValuation[]): Decimal {
  return valuations.reduce<Decimal>((acc, v) => acc.plus(v.totalValue), new Decimal(0));
}
