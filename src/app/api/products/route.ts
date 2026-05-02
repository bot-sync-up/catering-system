import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const products = await prisma.product.findMany({
    include: { prices: { include: { supplier: true } } },
    orderBy: { name: 'asc' }
  });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const body = await req.json();
  const product = await prisma.product.create({
    data: {
      name: body.name,
      unit: body.unit,
      category: body.category ?? null,
      notes: body.notes ?? null
    }
  });
  return NextResponse.json(product, { status: 201 });
}
