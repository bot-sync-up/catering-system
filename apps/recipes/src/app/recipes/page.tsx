'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('main');
  const [tier, setTier] = useState('BASIC');
  const [defaultServings, setDefaultServings] = useState(10);
  const [markupPct, setMarkupPct] = useState(200);
  const [q, setQ] = useState('');

  async function load() {
    const r = await fetch('/api/recipes').then((r) => r.json());
    setRecipes(r);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, category, tier, defaultServings, markupPct })
    });
    setName('');
    load();
  }

  async function remove(id: string) {
    if (!confirm('למחוק את המתכון לצמיתות?')) return;
    await fetch('/api/recipes/' + id, { method: 'DELETE' });
    load();
  }

  const filtered = recipes.filter((r) => r.name.includes(q));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">ספריית מתכונים</h1>
          <input className="input max-w-xs" placeholder="חיפוש…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="grid gap-3">
          {filtered.map((r) => {
            const v = r.currentVersion;
            return (
              <div key={r.id} className="card flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/recipes/${r.id}`} className="text-lg font-semibold text-brand-700 hover:underline">
                      {r.name}
                    </Link>
                    {v && (
                      <span className={'tag ' + (v.tier === 'VIP' ? 'tag-vip' : 'tag-basic')}>{v.tier}</span>
                    )}
                    {r.category && <span className="tag">{r.category}</span>}
                  </div>
                  <div className="text-sm text-stone-600 mt-1">
                    מנות ברירת־מחדל: {r.defaultServings} · Markup: {r.markupPct}% · גרסה נוכחית: {v?.label ?? '—'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link className="btn-ghost" href={`/recipes/${r.id}`}>פתיחה</Link>
                  <Link className="btn-ghost" href={`/print/${v?.id}`} target="_blank">הדפסה</Link>
                  <button className="btn-ghost text-red-600" onClick={() => remove(r.id)}>מחיקה</button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-stone-500">אין מתכונים תואמים.</p>}
        </div>
      </section>

      <aside>
        <h2 className="text-xl font-semibold mb-3">מתכון חדש</h2>
        <form className="card grid gap-3" onSubmit={create}>
          <div>
            <label className="label">שם המתכון</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">קטגוריה</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="appetizer">מנה ראשונה</option>
                <option value="main">מנה עיקרית</option>
                <option value="side">תוספת</option>
                <option value="dessert">קינוח</option>
                <option value="sauce">רוטב</option>
              </select>
            </div>
            <div>
              <label className="label">דרגה</label>
              <select className="input" value={tier} onChange={(e) => setTier(e.target.value)}>
                <option value="BASIC">בסיסי</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">מנות ברירת־מחדל</label>
              <input
                className="input" type="number" min={1}
                value={defaultServings} onChange={(e) => setDefaultServings(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Markup %</label>
              <input
                className="input" type="number" min={0}
                value={markupPct} onChange={(e) => setMarkupPct(Number(e.target.value))}
              />
            </div>
          </div>
          <button className="btn">יצירה</button>
        </form>
      </aside>
    </div>
  );
}
