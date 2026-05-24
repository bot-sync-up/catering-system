import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { rollback } from '@/lib/diff';

export async function GET(_: Request, { params }: { params: { id: string; vid: string } }) {
  const v = await prisma.recipeVersion.findUnique({
    where: { id: params.vid },
    include: { ingredients: { include: { product: true } } }
  });
  return NextResponse.json(v);
}

// PATCH = update ingredients/instructions in this version
export async function PATCH(req: Request, { params }: { params: { id: string; vid: string } }) {
  const body = await req.json();
  if (Array.isArray(body.ingredients)) {
    await prisma.recipeIngredient.deleteMany({ where: { versionId: params.vid } });
    await prisma.recipeIngredient.createMany({
      data: body.ingredients.map((i: any) => ({
        versionId: params.vid,
        productId: i.productId,
        qty: Number(i.qty),
        unit: i.unit,
        notes: i.notes ?? null
      }))
    });
  }
  const v = await prisma.recipeVersion.update({
    where: { id: params.vid },
    data: {
      instructions: body.instructions,
      servings: body.servings,
      prepMinutes: body.prepMinutes,
      cookMinutes: body.cookMinutes,
      label: body.label,
      message: body.message
    }
  });
  return NextResponse.json(v);
}

// POST { action: "rollback" } -> set as current
export async function POST(req: Request, { params }: { params: { id: string; vid: string } }) {
  const body = await req.json();
  if (body.action === 'rollback' || body.action === 'setCurrent') {
    const r = await rollback(params.id, params.vid);
    return NextResponse.json(r);
  }
  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
