import { prisma } from '../prisma';

export interface InventoryRevalRow {
  itemId: string;
  sku: string;
  name: string;
  qtyOnHand: number;
  bookCost: number;        // qty * stored cost
  fifoCost: number;        // recalculated using FIFO across PURCHASE movements
  revaluation: number;     // fifoCost - bookCost
}

/**
 * Inventory revaluation (שערוך מלאי) — FIFO by purchase movements.
 * Compares book value to FIFO-derived value and surfaces the delta.
 */
export async function inventoryRevaluation(asOf: Date = new Date()): Promise<InventoryRevalRow[]> {
  const items = await prisma.inventoryItem.findMany({
    include: {
      movements: {
        where: { occurredAt: { lte: asOf } },
        orderBy: { occurredAt: 'asc' },
      },
    },
  });

  const out: InventoryRevalRow[] = [];

  for (const item of items) {
    // FIFO layers: list of [qty, unitCost]
    const layers: Array<{ qty: number; cost: number }> = [];
    let qtyOnHand = 0;

    for (const m of item.movements) {
      const qty = Number(m.qty);
      const cost = Number(m.unitCost);
      if (m.type === 'PURCHASE' || (m.type === 'RETURN' && qty > 0)) {
        layers.push({ qty, cost });
        qtyOnHand += qty;
      } else if (m.type === 'CONSUME' || (m.type === 'ADJUST' && qty < 0)) {
        let need = Math.abs(qty);
        qtyOnHand -= Math.abs(qty);
        while (need > 0 && layers.length) {
          const layer = layers[0];
          if (layer.qty <= need) {
            need -= layer.qty;
            layers.shift();
          } else {
            layer.qty -= need;
            need = 0;
          }
        }
      } else if (m.type === 'ADJUST' && qty > 0) {
        layers.push({ qty, cost });
        qtyOnHand += qty;
      }
    }

    const fifoCost = layers.reduce((s, l) => s + l.qty * l.cost, 0);
    const bookCost = qtyOnHand * Number(item.cost);

    out.push({
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      qtyOnHand,
      bookCost: round(bookCost),
      fifoCost: round(fifoCost),
      revaluation: round(fifoCost - bookCost),
    });
  }

  return out;
}

function round(n: number) { return Math.round(n * 100) / 100; }
