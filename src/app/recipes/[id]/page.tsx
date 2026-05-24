'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [cost, setCost] = useState<any>(null);
  const [scaleGuests, setScaleGuests] = useState<number>(0);
  const [diff, setDiff] = useState<any>(null);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<any>(null);

  async function load() {
    const r = await fetch('/api/recipes/' + id).then((r) => r.json());
    setRecipe(r);
    setDraft({
      servings: r.currentVersion?.servings ?? 10,
      instructions: r.currentVersion?.instructions ?? '',
      prepMinutes: r.currentVersion?.prepMinutes ?? 60,
      cookMinutes: r.currentVersion?.cookMinutes ?? 0,
      ingredients: r.currentVersion?.ingredients?.map((i: any) => ({
        productId: i.productId,
        name: i.product.name,
        qty: i.qty,
        unit: i.unit
      })) ?? []
    });
    if (!from && r.versions?.[1]) setFrom(r.versions[1].id);
    if (!to && r.currentVersion) setTo(r.currentVersion.id);
  }

  async function loadCost() {
    if (!recipe?.currentVersion) return;
    const guests = scaleGuests || recipe.currentVersion.servings;
    const c = await fetch(`/api/cost?versionId=${recipe.currentVersion.id}&guests=${guests}`).then((r) => r.json());
    setCost(c);
  }

  useEffect(() => {
    load();
    fetch('/api/products').then((r) => r.json()).then(setProducts);
  }, [id]);
  useEffect(() => {
    loadCost();
  }, [recipe, scaleGuests]);

  async function save() {
    await fetch(`/api/recipes/${id}/versions/${recipe.currentVersion.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(draft)
    });
    setEdit(false);
    load();
  }

  async function commitNewVersion() {
    const label = prompt('תווית גרסה (למשל v2 / VIP):');
    if (!label) return;
    const message = prompt('הודעת קומיט:') ?? '';
    const tier = confirm('האם זו גרסת VIP? (אישור = VIP, ביטול = BASIC)') ? 'VIP' : 'BASIC';
    await fetch(`/api/recipes/${id}/versions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        parentId: recipe.currentVersion.id,
        tier, label, message,
        setCurrent: true
      })
    });
    load();
  }

  async function rollbackTo(vid: string) {
    if (!confirm('להפוך גרסה זו לנוכחית?')) return;
    await fetch(`/api/recipes/${id}/versions/${vid}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'rollback' })
    });
    load();
  }

  async function loadDiff() {
    if (!from || !to) return;
    const d = await fetch(`/api/recipes/${id}/diff?from=${from}&to=${to}`).then((r) => r.json());
    setDiff(d);
  }
  useEffect(() => { loadDiff(); }, [from, to]);

  function setIng(idx: number, patch: any) {
    setDraft((d: any) => {
      const ingredients = [...d.ingredients];
      ingredients[idx] = { ...ingredients[idx], ...patch };
      return { ...d, ingredients };
    });
  }
  function addIng() {
    if (!products[0]) return;
    setDraft((d: any) => ({
      ...d,
      ingredients: [...d.ingredients, { productId: products[0].id, name: products[0].name, qty: 0, unit: products[0].unit }]
    }));
  }
  function removeIng(idx: number) {
    setDraft((d: any) => ({ ...d, ingredients: d.ingredients.filter((_: any, i: number) => i !== idx) }));
  }

  if (!recipe) return <p>טוען…</p>;
  const v = recipe.currentVersion;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2">
        <Link href="/recipes" className="text-sm text-stone-500 hover:underline">← חזרה לרשימה</Link>
        <div className="flex items-center gap-3 mt-2 mb-4">
          <h1 className="text-2xl font-bold">{recipe.name}</h1>
          {v && <span className={'tag ' + (v.tier === 'VIP' ? 'tag-vip' : 'tag-basic')}>{v.tier} · {v.label}</span>}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">חומרי גלם בגרסה הנוכחית</h2>
            <div className="flex gap-2">
              {!edit && <button className="btn-ghost" onClick={() => setEdit(true)}>עריכה</button>}
              {edit && <button className="btn" onClick={save}>שמירה</button>}
              <button className="btn-ghost" onClick={commitNewVersion}>קומיט גרסה חדשה</button>
              <Link className="btn-ghost" href={`/print/${v.id}`} target="_blank">הדפסה</Link>
            </div>
          </div>

          {!edit && (
            <table className="w-full text-sm">
              <thead className="text-stone-500"><tr><th className="text-right">מוצר</th><th>כמות</th><th>יחידה</th></tr></thead>
              <tbody>
                {v.ingredients.map((i: any) => (
                  <tr key={i.id} className="border-t border-stone-100">
                    <td className="py-1">{i.product.name}</td>
                    <td className="text-center">{i.qty}</td>
                    <td className="text-center">{i.unit}</td>
                  </tr>
                ))}
                {v.ingredients.length === 0 && <tr><td colSpan={3} className="text-center text-stone-500 py-3">אין חומרי גלם.</td></tr>}
              </tbody>
            </table>
          )}

          {edit && (
            <div>
              <table className="w-full text-sm">
                <thead className="text-stone-500"><tr><th>מוצר</th><th>כמות</th><th>יחידה</th><th></th></tr></thead>
                <tbody>
                  {draft.ingredients.map((i: any, idx: number) => (
                    <tr key={idx} className="border-t border-stone-100">
                      <td className="py-1">
                        <select className="input" value={i.productId} onChange={(e) => {
                          const p = products.find((p) => p.id === e.target.value);
                          setIng(idx, { productId: e.target.value, name: p?.name, unit: p?.unit ?? i.unit });
                        }}>
                          {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                        </select>
                      </td>
                      <td><input type="number" step="0.01" className="input" value={i.qty} onChange={(e) => setIng(idx, { qty: Number(e.target.value) })} /></td>
                      <td><input className="input" value={i.unit} onChange={(e) => setIng(idx, { unit: e.target.value })} /></td>
                      <td><button className="btn-ghost text-red-600" onClick={() => removeIng(idx)}>הסר</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn-ghost mt-3" onClick={addIng}>+ הוסף שורה</button>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div><label className="label">מנות בגרסה</label>
                  <input type="number" className="input" value={draft.servings} onChange={(e) => setDraft({ ...draft, servings: Number(e.target.value) })} />
                </div>
                <div><label className="label">דק' הכנה</label>
                  <input type="number" className="input" value={draft.prepMinutes} onChange={(e) => setDraft({ ...draft, prepMinutes: Number(e.target.value) })} />
                </div>
                <div><label className="label">דק' בישול</label>
                  <input type="number" className="input" value={draft.cookMinutes} onChange={(e) => setDraft({ ...draft, cookMinutes: Number(e.target.value) })} />
                </div>
              </div>
              <div className="mt-3"><label className="label">הוראות הכנה</label>
                <textarea className="input min-h-[160px]" value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} />
              </div>
            </div>
          )}
        </div>

        <div className="card mt-4">
          <h2 className="font-semibold mb-3">השוואת גרסאות (diff)</h2>
          <div className="flex flex-wrap gap-2 items-end mb-3">
            <div><label className="label">מ-</label>
              <select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
                {recipe.versions.map((v: any) => <option key={v.id} value={v.id}>{v.tier} · {v.label}</option>)}
              </select>
            </div>
            <div><label className="label">אל-</label>
              <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
                {recipe.versions.map((v: any) => <option key={v.id} value={v.id}>{v.tier} · {v.label}</option>)}
              </select>
            </div>
          </div>
          {diff && (
            <table className="w-full text-sm">
              <thead className="text-stone-500"><tr><th>שינוי</th><th>מוצר</th><th>לפני</th><th>אחרי</th></tr></thead>
              <tbody>
                {diff.ingredients.map((d: any) => (
                  <tr key={d.productId} className={
                    d.type === 'added' ? 'bg-green-50' :
                    d.type === 'removed' ? 'bg-red-50' :
                    d.type === 'changed' ? 'bg-amber-50' : ''
                  }>
                    <td className="py-1 text-center">{d.type === 'added' ? '+' : d.type === 'removed' ? '−' : d.type === 'changed' ? '≠' : '='}</td>
                    <td>{d.name}</td>
                    <td className="text-center">{d.before ? `${d.before.qty} ${d.before.unit}` : '—'}</td>
                    <td className="text-center">{d.after ? `${d.after.qty} ${d.after.unit}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <aside className="grid gap-4 content-start">
        <div className="card">
          <h3 className="font-semibold mb-2">עלות ומחיר מכירה</h3>
          <div className="flex items-end gap-2 mb-3">
            <div className="flex-1">
              <label className="label">חישוב לפי מס' אורחים</label>
              <input type="number" min={0} className="input" placeholder={`${v?.servings}`} value={scaleGuests || ''} onChange={(e) => setScaleGuests(Number(e.target.value))} />
            </div>
            <button className="btn" onClick={loadCost}>חשב</button>
          </div>
          {cost && (
            <div className="text-sm">
              <div className="flex justify-between"><span>עלות כוללת:</span><strong>{cost.total.toFixed(2)} ₪</strong></div>
              <div className="flex justify-between"><span>עלות למנה:</span><strong>{cost.perServing.toFixed(2)} ₪</strong></div>
              <div className="flex justify-between"><span>Markup:</span><strong>{cost.markupPct}%</strong></div>
              <div className="flex justify-between text-brand-700"><span>מחיר מכירה כולל:</span><strong>{cost.salePrice.toFixed(2)} ₪</strong></div>
              <div className="flex justify-between text-brand-700"><span>מחיר למנה:</span><strong>{cost.salePerServing.toFixed(2)} ₪</strong></div>
              <details className="mt-2"><summary className="cursor-pointer text-stone-500">פירוט שורות</summary>
                <table className="w-full mt-2 text-xs">
                  <thead><tr><th className="text-right">מוצר</th><th>כמות</th><th>עלות יח'</th><th>שורה</th></tr></thead>
                  <tbody>
                    {cost.lines.map((l: any) => (
                      <tr key={l.productId} className="border-t border-stone-100">
                        <td>{l.name}</td>
                        <td className="text-center">{l.qty.toFixed(2)} {l.unit}</td>
                        <td className="text-center">{l.unitCost.toFixed(2)}</td>
                        <td className="text-center">{l.lineCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold mb-2">היסטוריית גרסאות</h3>
          <ul className="text-sm space-y-1">
            {recipe.versions.map((vv: any) => (
              <li key={vv.id} className="flex items-center justify-between border-b border-stone-100 py-1">
                <span>
                  <span className={'tag ' + (vv.tier === 'VIP' ? 'tag-vip' : 'tag-basic')}>{vv.tier}</span>{' '}
                  <strong>{vv.label}</strong>{' '}
                  <span className="text-stone-500">— {vv.message || ''}</span>
                </span>
                {vv.id !== recipe.currentVersionId
                  ? <button className="btn-ghost text-xs" onClick={() => rollbackTo(vv.id)}>שחזר</button>
                  : <span className="tag">נוכחי</span>}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
