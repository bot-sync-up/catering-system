import { prisma } from './db';
import { convert } from './units';

// Cost = SUM(qty x min(price)) where price is converted to ingredient unit.
export async function recipeCost(versionId: string, scale = 1): Promise<{
  total: number;
  perServing: number;
  lines: { productId: string; name: string; qty: number; unit: string; unitCost: number; lineCost: number; supplierId?: string }[];
}> {
  const version = await prisma.recipeVersion.findUnique({
    where: { id: versionId },
    include: {
      ingredients: { include: { product: { include: { prices: true } } } }
    }
  });
  if (!version) throw new Error('version not found');

  const lines = version.ingredients.map((ing) => {
    const scaledQty = ing.qty * scale;
    let bestUnitCost = Infinity;
    let bestSupplier: string | undefined;
    for (const p of ing.product.prices) {
      // price is per p.unit; convert 1 unit of ingredient.unit to p.unit
      const factor = convert(1, ing.unit, p.unit);
      if (factor == null) continue;
      const unitCost = p.price * factor; // per ing.unit
      if (unitCost < bestUnitCost) {
        bestUnitCost = unitCost;
        bestSupplier = p.supplierId;
      }
    }
    if (!isFinite(bestUnitCost)) bestUnitCost = 0;
    const lineCost = bestUnitCost * scaledQty;
    return {
      productId: ing.productId,
      name: ing.product.name,
      qty: scaledQty,
      unit: ing.unit,
      unitCost: bestUnitCost,
      lineCost,
      supplierId: bestSupplier
    };
  });

  const total = lines.reduce((s, l) => s + l.lineCost, 0);
  const servings = version.servings * scale;
  return { total, perServing: servings ? total / servings : 0, lines };
}

// Markup -> sale price
export function applyMarkup(cost: number, markupPct: number): number {
  return cost * (1 + markupPct / 100);
}

// Reverse: implied markup if sale price set
export function impliedMarkup(cost: number, salePrice: number): number {
  if (cost <= 0) return 0;
  return ((salePrice - cost) / cost) * 100;
}
