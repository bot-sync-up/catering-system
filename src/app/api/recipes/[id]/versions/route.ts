import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Create a new version (commit) - copies from parent if specified.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parentId: string | undefined = body.parentId;
  const tier: string = body.tier ?? 'BASIC';

  let parent = null;
  if (parentId) {
    parent = await prisma.recipeVersion.findUnique({
      where: { id: parentId },
      include: { ingredients: true }
    });
  }

  const v = await prisma.recipeVersion.create({
    data: {
      recipeId: params.id,
      parentId: parentId ?? null,
      tier,
      label: body.label,
      message: body.message ?? '',
      servings: body.servings ?? parent?.servings ?? 10,
      instructions: body.instructions ?? parent?.instructions ?? '',
      prepMinutes: body.prepMinutes ?? parent?.prepMinutes ?? 60,
      cookMinutes: body.cookMinutes ?? parent?.cookMinutes ?? 0,
      ingredients: parent
        ? {
            create: parent.ingredients.map((i) => ({
              productId: i.productId,
              qty: i.qty,
              unit: i.unit,
              notes: i.notes
            }))
          }
        : undefined
    }
  });

  if (body.setCurrent) {
    await prisma.recipe.update({ where: { id: params.id }, data: { currentVersionId: v.id } });
  }
  return NextResponse.json(v, { status: 201 });
}
