import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  return NextResponse.json(await prisma.event.findMany({ orderBy: { date: 'desc' } }));
}

export async function POST(req: Request) {
  const body = await req.json();
  const e = await prisma.event.create({
    data: {
      name: body.name,
      date: new Date(body.date),
      guests: Number(body.guests ?? 50),
      notes: body.notes ?? null
    }
  });
  return NextResponse.json(e, { status: 201 });
}
