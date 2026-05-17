import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  return NextResponse.json(await prisma.supplier.findMany({ orderBy: { name: 'asc' } }));
}

export async function POST(req: Request) {
  const body = await req.json();
  const s = await prisma.supplier.create({ data: { name: body.name, phone: body.phone ?? null } });
  return NextResponse.json(s, { status: 201 });
}
