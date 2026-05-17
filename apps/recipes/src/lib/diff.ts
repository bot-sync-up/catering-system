import { prisma } from './db';

export interface DiffLine {
  type: 'added' | 'removed' | 'changed' | 'same';
  productId: string;
  name: string;
  before?: { qty: number; unit: string };
  after?: { qty: number; unit: string };
}

export async function diffVersions(aId: string, bId: string): Promise<{
  meta: { from: string; to: string; servingsBefore: number; servingsAfter: number };
  ingredients: DiffLine[];
  instructions: { before?: string; after?: string };
}> {
  const [a, b] = await Promise.all([
    prisma.recipeVersion.findUnique({ where: { id: aId }, include: { ingredients: { include: { product: true } } } }),
    prisma.recipeVersion.findUnique({ where: { id: bId }, include: { ingredients: { include: { product: true } } } })
  ]);
  if (!a || !b) throw new Error('version not found');

  const map = new Map<string, DiffLine>();
  for (const ing of a.ingredients) {
    map.set(ing.productId, {
      type: 'removed',
      productId: ing.productId,
      name: ing.product.name,
      before: { qty: ing.qty, unit: ing.unit }
    });
  }
  for (const ing of b.ingredients) {
    const prev = map.get(ing.productId);
    if (!prev) {
      map.set(ing.productId, {
        type: 'added',
        productId: ing.productId,
        name: ing.product.name,
        after: { qty: ing.qty, unit: ing.unit }
      });
    } else {
      const same = prev.before!.qty === ing.qty && prev.before!.unit === ing.unit;
      map.set(ing.productId, {
        type: same ? 'same' : 'changed',
        productId: ing.productId,
        name: ing.product.name,
        before: prev.before,
        after: { qty: ing.qty, unit: ing.unit }
      });
    }
  }

  return {
    meta: {
      from: a.label,
      to: b.label,
      servingsBefore: a.servings,
      servingsAfter: b.servings
    },
    ingredients: Array.from(map.values()).sort((x, y) => x.name.localeCompare(y.name, 'he')),
    instructions: { before: a.instructions ?? undefined, after: b.instructions ?? undefined }
  };
}

// Rollback: makes target version the current version (no destructive history).
export async function rollback(recipeId: string, targetVersionId: string) {
  const target = await prisma.recipeVersion.findUnique({ where: { id: targetVersionId } });
  if (!target || target.recipeId !== recipeId) throw new Error('invalid target');
  return prisma.recipe.update({
    where: { id: recipeId },
    data: { currentVersionId: targetVersionId }
  });
}
