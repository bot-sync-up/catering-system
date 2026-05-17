import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { planEvent, workerUtilisation } from '@/lib/prep';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const eventId = url.searchParams.get('eventId');
  if (eventId) {
    const tasks = await prisma.prepTask.findMany({
      where: { eventId },
      include: { version: { include: { recipe: true } } },
      orderBy: { startAt: 'asc' }
    });
    return NextResponse.json(tasks);
  }
  const tasks = await prisma.prepTask.findMany({
    include: { version: { include: { recipe: true } }, event: true },
    orderBy: { startAt: 'asc' }
  });
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.action === 'plan' && body.eventId) {
    return NextResponse.json(await planEvent(body.eventId));
  }
  if (body.action === 'utilisation') {
    return NextResponse.json(
      await workerUtilisation(new Date(body.from), new Date(body.to))
    );
  }
  // create task
  const t = await prisma.prepTask.create({
    data: {
      eventId: body.eventId ?? null,
      versionId: body.versionId,
      title: body.title,
      station: body.station ?? null,
      assignee: body.assignee ?? null,
      startAt: new Date(body.startAt),
      durationMin: Number(body.durationMin ?? 30),
      parallel: !!body.parallel,
      mustPrep: body.mustPrep ?? true,
      servings: body.servings ?? 10
    }
  });
  return NextResponse.json(t, { status: 201 });
}
