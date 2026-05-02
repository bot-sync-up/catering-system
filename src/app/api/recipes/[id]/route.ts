import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
    include: {
      versions: { orderBy: { createdAt: 'desc' } },
      currentVersion: { include: { ingredients: { include: { product: true } } } }
    }
  });
  if (!recipe) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const r = await prisma.recipe.update({
    where: { id: params.id },
    data: {
      name: body.name,
      category: body.category,
      defaultServings: body.defaultServings,
      markupPct: body.markupPct
    }
  });
  return NextResponse.json(r);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await prisma.recipe.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
