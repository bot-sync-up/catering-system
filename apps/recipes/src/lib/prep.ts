import { prisma } from './db';

// Build a prep schedule for an event.
// We work backwards from event start. Tasks marked `parallel` may overlap on
// the same station with other parallel tasks; serial tasks block the station.
export async function planEvent(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('event not found');

  const tasks = await prisma.prepTask.findMany({
    where: { eventId },
    include: { version: { include: { recipe: true } } }
  });

  // Group by station, sort longest-first (LPT heuristic).
  const byStation = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const s = t.station || 'general';
    if (!byStation.has(s)) byStation.set(s, []);
    byStation.get(s)!.push(t);
  }

  const eventStart = event.date.getTime();
  const updates: { id: string; startAt: Date }[] = [];

  for (const [, group] of byStation) {
    group.sort((a, b) => b.durationMin - a.durationMin);
    let cursor = eventStart;
    let parallelEnd = eventStart;
    for (const t of group) {
      const start = t.parallel
        ? cursor - t.durationMin * 60_000
        : Math.min(cursor, parallelEnd) - t.durationMin * 60_000;
      const end = start + t.durationMin * 60_000;
      if (t.parallel) {
        parallelEnd = Math.min(parallelEnd, start);
      } else {
        cursor = start;
      }
      updates.push({ id: t.id, startAt: new Date(start) });
      void end;
    }
  }

  await Promise.all(
    updates.map((u) => prisma.prepTask.update({ where: { id: u.id }, data: { startAt: u.startAt } }))
  );

  return updates;
}

// Worker utilisation across a date range.
export async function workerUtilisation(from: Date, to: Date) {
  const tasks = await prisma.prepTask.findMany({
    where: { startAt: { gte: from, lte: to }, assignee: { not: null } }
  });
  const total = (to.getTime() - from.getTime()) / 60_000;
  const map = new Map<string, number>();
  for (const t of tasks) {
    map.set(t.assignee!, (map.get(t.assignee!) ?? 0) + t.durationMin);
  }
  return Array.from(map.entries()).map(([name, mins]) => ({
    name,
    minutes: mins,
    utilisationPct: total ? (mins / total) * 100 : 0
  }));
}
