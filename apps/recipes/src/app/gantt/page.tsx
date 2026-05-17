'use client';
import { useEffect, useMemo, useState } from 'react';

const STATION_COLOR: Record<string, string> = {
  hot: '#dc2626',
  cold: '#0284c7',
  pastry: '#9333ea',
  general: '#65a30d'
};

export default function GanttPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState<string>('');

  async function load() {
    const [t, e] = await Promise.all([
      fetch('/api/prep' + (eventId ? '?eventId=' + eventId : '')).then((r) => r.json()),
      fetch('/api/prep/events').then((r) => r.json())
    ]);
    setTasks(t.filter((x: any) => x.mustPrep));
    setEvents(e);
    if (!eventId && e[0]) setEventId(e[0].id);
  }
  useEffect(() => { load(); }, [eventId]);

  const { start, end, totalMin, byStation } = useMemo(() => {
    if (!tasks.length) return { start: 0, end: 0, totalMin: 0, byStation: new Map() };
    const start = Math.min(...tasks.map((t) => new Date(t.startAt).getTime()));
    const end = Math.max(...tasks.map((t) => new Date(t.startAt).getTime() + t.durationMin * 60_000));
    const byStation = new Map<string, any[]>();
    for (const t of tasks) {
      const s = t.station || 'general';
      if (!byStation.has(s)) byStation.set(s, []);
      byStation.get(s)!.push(t);
    }
    return { start, end, totalMin: (end - start) / 60_000, byStation };
  }, [tasks]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Gantt — חייבי הכנה</h1>
        <select className="input max-w-sm" value={eventId} onChange={(e) => setEventId(e.target.value)}>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name} — {new Date(e.date).toLocaleString('he-IL')}</option>)}
        </select>
      </div>

      {tasks.length === 0 && <p className="text-stone-500">אין משימות הדורשות הכנה לאירוע זה.</p>}

      {tasks.length > 0 && (
        <div className="card">
          <div className="flex justify-between text-xs text-stone-500 mb-2">
            <span>{new Date(start).toLocaleString('he-IL')}</span>
            <span>סך־הכל {(totalMin / 60).toFixed(1)} שעות</span>
            <span>{new Date(end).toLocaleString('he-IL')}</span>
          </div>
          <div>
            {Array.from(byStation.entries()).map(([station, list]) => (
              <div key={station} className="mb-3">
                <div className="text-sm font-medium mb-1">תחנה: {station}</div>
                {list.map((t) => {
                  const left = ((new Date(t.startAt).getTime() - start) / (end - start)) * 100;
                  const width = ((t.durationMin * 60_000) / (end - start)) * 100;
                  return (
                    <div key={t.id} className="gantt-row">
                      <div
                        className="gantt-bar"
                        style={{
                          right: left + '%',
                          width: width + '%',
                          background: STATION_COLOR[station] ?? '#737373'
                        }}
                        title={`${t.title} — ${t.assignee || ''} — ${t.durationMin} דק'`}
                      >
                        {t.title} {t.assignee ? `(${t.assignee})` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
