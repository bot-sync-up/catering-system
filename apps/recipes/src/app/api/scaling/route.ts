import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Returns a recipe scaled to target guests (does not persist).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const versionId = url.searchParams.get('versionId');
  const guests = Number(url.searchParams.get('guests') ?? '0');
  if (!versionId || !guests) return NextResponse.json({ error: 'versionId & guests required' }, { status: 400 });

  const v = await prisma.recipeVersion.findUnique({
    where: { id: versionId },
    include: { ingredients: { include: { product: true } }, recipe: true }
  });
  if (!v) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const scale = guests / v.servings;
  return NextResponse.json({
    recipe: v.recipe.name,
    label: v.label,
    fromServings: v.servings,
    toServings: guests,
    scale,
    prepMinutes: Math.ceil(v.prepMinutes * Math.sqrt(scale)), // not perfectly linear
    cookMinutes: v.cookMinutes,                               // typically constant
    ingredients: v.ingredients.map((i) => ({
      product: i.product.name,
      qty: +(i.qty * scale).toFixed(3),
      unit: i.unit
    }))
  });
}
