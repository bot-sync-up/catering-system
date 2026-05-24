import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  const body = await req.json();
  const sp = await prisma.supplierPrice.create({
    data: {
      productId: body.productId,
      supplierId: body.supplierId,
      price: Number(body.price),
      unit: body.unit,
      notes: body.notes ?? null
    }
  });
  return NextResponse.json(sp, { status: 201 });
}
