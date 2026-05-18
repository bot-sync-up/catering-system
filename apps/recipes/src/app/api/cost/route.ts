import { NextResponse } from 'next/server';
import { recipeCost, applyMarkup } from '@/lib/cost';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const versionId = url.searchParams.get('versionId');
  const guests = Number(url.searchParams.get('guests') ?? '0');
  if (!versionId) return NextResponse.json({ error: 'versionId required' }, { status: 400 });

  const v = await prisma.recipeVersion.findUnique({
    where: { id: versionId },
    include: { recipe: true }
  });
  if (!v) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const scale = guests > 0 ? guests / v.servings : 1;
  const c = await recipeCost(versionId, scale);
  const sale = applyMarkup(c.total, v.recipe.markupPct);
  return NextResponse.json({
    ...c,
    scale,
    markupPct: v.recipe.markupPct,
    salePrice: sale,
    salePerServing: sale / (v.servings * scale)
  });
}
