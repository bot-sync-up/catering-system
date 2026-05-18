'use client';
import { useEffect, useState } from 'react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [category, setCategory] = useState('');
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');

  async function loadAll() {
    const [p, s] = await Promise.all([
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/suppliers').then((r) => r.json())
    ]);
    setProducts(p);
    setSuppliers(s);
  }
  useEffect(() => { loadAll(); }, []);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, unit, category })
    });
    setName(''); setCategory('');
    loadAll();
  }
  async function createSupplier(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: supName, phone: supPhone })
    });
    setSupName(''); setSupPhone('');
    loadAll();
  }
  async function addPrice(productId: string) {
    const supplierId = (document.getElementById('sup-' + productId) as HTMLSelectElement).value;
    const price = Number((document.getElementById('price-' + productId) as HTMLInputElement).value);
    const unitV = (document.getElementById('unit-' + productId) as HTMLInputElement).value;
    if (!supplierId || !price || !unitV) return;
    await fetch('/api/suppliers/prices', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId, supplierId, price, unit: unitV })
    });
    loadAll();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2">
        <h1 className="text-2xl font-bold mb-4">חומרי גלם</h1>
        <div className="grid gap-3">
          {products.map((p) => {
            const minPrice = p.prices.length ? Math.min(...p.prices.map((x: any) => x.price)) : null;
            return (
              <div key={p.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{p.name} <span className="tag">{p.unit}</span> {p.category && <span className="tag">{p.category}</span>}</h2>
                    {minPrice != null && <div className="text-sm text-stone-600">מחיר מינ': {minPrice.toFixed(2)} ₪</div>}
                  </div>
                </div>
                <div className="mt-3">
                  <table className="w-full text-sm">
                    <thead className="text-stone-500"><tr><th>ספק</th><th>מחיר</th><th>יחידה</th><th>תוקף</th></tr></thead>
                    <tbody>
                      {p.prices.map((pr: any) => (
                        <tr key={pr.id} className="border-t border-stone-100">
                          <td>{pr.supplier.name}</td>
                          <td className="text-center">{pr.price.toFixed(2)} ₪</td>
                          <td className="text-center">{pr.unit}</td>
                          <td className="text-center text-stone-500">{new Date(pr.validFrom).toLocaleDateString('he-IL')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex flex-wrap items-end gap-2 mt-3">
                    <div>
                      <label className="label text-xs">ספק</label>
                      <select id={'sup-' + p.id} className="input">
                        <option value="">— בחר —</option>
                        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div><label className="label text-xs">מחיר</label><input id={'price-' + p.id} type="number" step="0.01" className="input" /></div>
                    <div><label className="label text-xs">יח'</label><input id={'unit-' + p.id} defaultValue={p.unit} className="input w-20" /></div>
                    <button className="btn" onClick={() => addPrice(p.id)}>הוספת מחיר</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <aside className="grid gap-4 content-start">
        <form className="card grid gap-2" onSubmit={createProduct}>
          <h3 className="font-semibold">מוצר חדש</h3>
          <input className="input" placeholder="שם" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="input" placeholder="קטגוריה" value={category} onChange={(e) => setCategory(e.target.value)} />
          <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="kg">קילוגרם</option>
            <option value="g">גרם</option>
            <option value="l">ליטר</option>
            <option value="ml">מ"ל</option>
            <option value="unit">יחידה</option>
          </select>
          <button className="btn">הוספה</button>
        </form>
        <form className="card grid gap-2" onSubmit={createSupplier}>
          <h3 className="font-semibold">ספק חדש</h3>
          <input className="input" placeholder="שם" value={supName} onChange={(e) => setSupName(e.target.value)} required />
          <input className="input" placeholder="טלפון" value={supPhone} onChange={(e) => setSupPhone(e.target.value)} />
          <button className="btn">הוספה</button>
        </form>
        <div className="card">
          <h3 className="font-semibold mb-2">ספקים רשומים</h3>
          <ul className="text-sm">
            {suppliers.map((s) => <li key={s.id} className="border-b border-stone-100 py-1">{s.name} <span className="text-stone-500">{s.phone}</span></li>)}
          </ul>
        </div>
      </aside>
    </div>
  );
}
