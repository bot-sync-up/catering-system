'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function PrepPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [evName, setEvName] = useState('');
  const [evDate, setEvDate] = useState('');
  const [evGuests, setEvGuests] = useState(50);
  const [evSel, setEvSel] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskVersionId, setTaskVersionId] = useState('');
  const [taskStation, setTaskStation] = useState('hot');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDur, setTaskDur] = useState(60);
  const [taskParallel, setTaskParallel] = useState(false);

  async function load() {
    const [e, t, r] = await Promise.all([
      fetch('/api/prep/events').then((r) => r.json()),
      fetch('/api/prep' + (evSel ? '?eventId=' + evSel : '')).then((r) => r.json()),
      fetch('/api/recipes').then((r) => r.json())
    ]);
    setEvents(e); setTasks(t); setRecipes(r);
    if (!evSel && e[0]) setEvSel(e[0].id);
  }
  useEffect(() => { load(); }, [evSel]);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/prep/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: evName, date: evDate, guests: evGuests })
    });
    setEvName(''); setEvDate('');
    load();
  }
  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!evSel || !taskVersionId) return;
    const ev = events.find((x) => x.id === evSel);
    await fetch('/api/prep', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        eventId: evSel,
        versionId: taskVersionId,
        title: taskTitle,
        station: taskStation,
        assignee: taskAssignee,
        durationMin: taskDur,
        parallel: taskParallel,
        startAt: ev.date,
        servings: ev.guests
      })
    });
    setTaskTitle(''); setTaskAssignee('');
    load();
  }
  async function plan() {
    if (!evSel) return;
    await fetch('/api/prep', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'plan', eventId: evSel })
    });
    load();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">תכנון הכנה</h1>
          <div className="flex gap-2">
            <select className="input" value={evSel} onChange={(e) => setEvSel(e.target.value)}>
              {events.map((e) => <option key={e.id} value={e.id}>{e.name} — {new Date(e.date).toLocaleString('he-IL')}</option>)}
            </select>
            <button className="btn" onClick={plan}>תזמון אוטומטי</button>
          </div>
        </div>
        <div className="card">
          <table className="w-full text-sm">
            <thead className="text-stone-500"><tr>
              <th>משימה</th><th>מתכון</th><th>תחנה</th><th>עובד</th><th>מתי</th><th>דק'</th><th>‖</th>
            </tr></thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-t border-stone-100">
                  <td className="py-1">{t.title}</td>
                  <td>{t.version?.recipe?.name}</td>
                  <td className="text-center">{t.station}</td>
                  <td className="text-center">{t.assignee}</td>
                  <td className="text-center">{new Date(t.startAt).toLocaleString('he-IL')}</td>
                  <td className="text-center">{t.durationMin}</td>
                  <td className="text-center">{t.parallel ? '✓' : ''}</td>
                </tr>
              ))}
              {tasks.length === 0 && <tr><td colSpan={7} className="text-center text-stone-500 py-4">אין משימות לאירוע זה.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Link className="btn-ghost" href="/gantt">לפתיחת Gantt</Link>{' '}
          <Link className="btn-ghost" href="/staff">דוח ניצול עובדים</Link>
        </div>
      </section>

      <aside className="grid gap-4 content-start">
        <form className="card grid gap-2" onSubmit={createEvent}>
          <h3 className="font-semibold">אירוע חדש</h3>
          <input className="input" placeholder="שם אירוע" value={evName} onChange={(e) => setEvName(e.target.value)} required />
          <input className="input" type="datetime-local" value={evDate} onChange={(e) => setEvDate(e.target.value)} required />
          <input className="input" type="number" min={1} value={evGuests} onChange={(e) => setEvGuests(Number(e.target.value))} placeholder="מס' אורחים" />
          <button className="btn">יצירה</button>
        </form>

        <form className="card grid gap-2" onSubmit={createTask}>
          <h3 className="font-semibold">משימה חדשה</h3>
          <input className="input" placeholder="כותרת" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required />
          <select className="input" value={taskVersionId} onChange={(e) => setTaskVersionId(e.target.value)} required>
            <option value="">— בחר מתכון —</option>
            {recipes.map((r: any) => r.currentVersion && (
              <option key={r.id} value={r.currentVersion.id}>{r.name} ({r.currentVersion.label})</option>
            ))}
          </select>
          <select className="input" value={taskStation} onChange={(e) => setTaskStation(e.target.value)}>
            <option value="hot">חם</option><option value="cold">קר</option><option value="pastry">קונדיטוריה</option><option value="general">כללי</option>
          </select>
          <input className="input" placeholder="עובד אחראי" value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} />
          <input className="input" type="number" value={taskDur} onChange={(e) => setTaskDur(Number(e.target.value))} placeholder="משך בדק'" />
          <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={taskParallel} onChange={(e) => setTaskParallel(e.target.checked)} /> ניתן לבצע במקביל</label>
          <button className="btn">הוספה</button>
        </form>
      </aside>
    </div>
  );
}
