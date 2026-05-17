'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { ils } from '@/lib/format';

type Item = { id: string; name: string; description: string; price: number; category: string };
type Prefs = { hideCategories: string[]; favoriteIds: string[] };

export default function MenuPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [prefs, setPrefs] = useState<Prefs>({ hideCategories: [], favoriteIds: [] });
  const [cart, setCart] = useState<Record<string, number>>({});
  const [editPrefs, setEditPrefs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/menu').then(r => r.json()).then(j => {
      setItems(j.items || []);
      setPrefs(j.prefs || { hideCategories: [], favoriteIds: [] });
    });
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => set.add(i.category));
    return Array.from(set);
  }, [items]);

  const allCategories = useMemo(() => Array.from(new Set([...categories, ...prefs.hideCategories])), [categories, prefs.hideCategories]);

  const total = useMemo(() => {
    return Object.entries(cart).reduce((s, [id, qty]) => {
      const it = items.find(x => x.id === id);
      return s + (it ? it.price * qty : 0);
    }, 0);
  }, [cart, items]);

  function add(id: string) { setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 })); }
  function dec(id: string) { setCart(c => { const n = (c[id] || 0) - 1; const o = { ...c }; if (n <= 0) delete o[id]; else o[id] = n; return o; }); }

  async function toggleFav(id: string) {
    const next = prefs.favoriteIds.includes(id)
      ? prefs.favoriteIds.filter(x => x !== id)
      : [...prefs.favoriteIds, id];
    const np = { ...prefs, favoriteIds: next };
    setPrefs(np);
    await fetch('/api/menu/prefs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(np) });
  }

  async function toggleHide(cat: string) {
    const next = prefs.hideCategories.includes(cat)
      ? prefs.hideCategories.filter(x => x !== cat)
      : [...prefs.hideCategories, cat];
    const np = { ...prefs, hideCategories: next };
    setPrefs(np);
    await fetch('/api/menu/prefs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(np) });
    // Refresh menu so hidden categories filter out.
    const r = await fetch('/api/menu'); const j = await r.json();
    setItems(j.items || []);
  }

  async function checkout() {
    setBusy(true); setErr(null);
    try {
      const lines = Object.entries(cart).map(([itemId, qty]) => ({ itemId, qty }));
      if (!lines.length) throw new Error('עגלה ריקה');
      const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'שגיאה ביצירת הזמנה');
      // Get Cardcom iframe URL.
      const r2 = await fetch('/api/checkout/cardcom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: j.order.id }) });
      const j2 = await r2.json();
      if (!r2.ok) throw new Error(j2.error || 'שגיאה בהפניית תשלום');
      router.push(j2.iframeUrl);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  const visible = items.filter(i => !prefs.hideCategories.includes(i.category));
  const grouped: Record<string, Item[]> = {};
  for (const it of visible) {
    (grouped[it.category] ||= []).push(it);
  }
  // Favorites first.
  const sortedCats = Object.keys(grouped).sort((a, b) => {
    const af = grouped[a].some(i => prefs.favoriteIds.includes(i.id));
    const bf = grouped[b].some(i => prefs.favoriteIds.includes(i.id));
    return Number(bf) - Number(af);
  });

  return (
    <>
      <Header />
      <main className="flex-1 p-4 space-y-4 pb-32">
        <section className="card">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">תפריט</h2>
            <button className="text-sm text-brand" onClick={() => setEditPrefs(v => !v)}>
              {editPrefs ? 'סיום' : 'התאם תפריט'}
            </button>
          </div>
          {editPrefs && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-slate-500">בחר קטגוריות שתרצה להסתיר:</p>
              {allCategories.map(cat => (
                <label key={cat} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={prefs.hideCategories.includes(cat)}
                    onChange={() => toggleHide(cat)}
                  />
                  {cat}
                </label>
              ))}
            </div>
          )}
        </section>

        {sortedCats.map(cat => (
          <section key={cat} className="card">
            <h3 className="font-semibold mb-3">{cat}</h3>
            <ul className="divide-y divide-slate-100">
              {grouped[cat].map(it => {
                const qty = cart[it.id] || 0;
                const fav = prefs.favoriteIds.includes(it.id);
                return (
                  <li key={it.id} className="py-3 flex items-center gap-3">
                    <button onClick={() => toggleFav(it.id)} className="text-amber-500" aria-label="מועדף">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill={fav ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth="1.5">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <div className="flex-1">
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs text-slate-500">{it.description}</div>
                      <div className="text-sm text-brand-dark mt-1">{ils(it.price)}</div>
                    </div>
                    {qty === 0 ? (
                      <button className="btn-primary !py-2 !px-3 text-sm" onClick={() => add(it.id)}>הוסף</button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button className="btn-secondary !py-1 !px-2" onClick={() => dec(it.id)}>-</button>
                        <span className="w-6 text-center font-medium">{qty}</span>
                        <button className="btn-secondary !py-1 !px-2" onClick={() => add(it.id)}>+</button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {err && <p className="text-sm text-red-600 text-center">{err}</p>}
      </main>

      {Object.keys(cart).length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">סה"כ: <strong>{ils(total)}</strong></span>
            <span className="text-xs text-slate-500">{Object.values(cart).reduce((a, b) => a + b, 0)} פריטים</span>
          </div>
          <button className="btn-primary w-full" onClick={checkout} disabled={busy}>{busy ? 'מעבר לתשלום...' : 'המשך לתשלום'}</button>
        </div>
      )}

      <BottomNav />
    </>
  );
}
