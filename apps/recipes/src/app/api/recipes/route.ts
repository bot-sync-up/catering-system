import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const recipes = await prisma.recipe.findMany({
    include: { currentVersion: { include: { ingredients: true } } },
    orderBy: { name: 'asc' }
  });
  return NextResponse.json(recipes);
}

export async function POST(req: Request) {
  const body = await req.json();
  const recipe = await prisma.recipe.create({
    data: {
      name: body.name,
      category: body.category ?? null,
      defaultServings: body.defaultServings ?? 10,
      markupPct: body.markupPct ?? 200
    }
  });
  // Initial empty version
  const v = await prisma.recipeVersion.create({
    data: {
      recipeId: recipe.id,
      tier: body.tier ?? 'BASIC',
      label: 'v1',
      message: 'יצירה ראשונית',
      servings: recipe.defaultServings,
      instructions: body.instructions ?? ''
    }
  });
  await prisma.recipe.update({ where: { id: recipe.id }, data: { currentVersionId: v.id } });
  return NextResponse.json({ ...recipe, currentVersionId: v.id }, { status: 201 });
}
