import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { customersApi, itemsApi, packagesApi, pricingApi, ordersApi, couponsApi } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import { fmt } from '../components/Currency.jsx';

export default function OrderBuilder() {
  const nav = useNavigate();
  const [cart, setCart] = useState({
    customerId: '',
    packageId: '',
    eventDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    guestCount: 50,
    items: [],
    couponCode: '',
    loyaltyPointsToRedeem: 0,
    notes: '',
  });
  const [calculation, setCalculation] = useState(null);
  const [calcError, setCalcError] = useState(null);

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });
  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: itemsApi.list });
  const { data: packages = [] } = useQuery({ queryKey: ['packages'], queryFn: packagesApi.list });

  const customer = customers.find(c => c.id === cart.customerId);

  const calcM = useMutation({
    mutationFn: () => pricingApi.calculate(cart),
    onSuccess: (r) => { setCalculation(r); setCalcError(null); },
    onError: (e) => { setCalcError(e.message); setCalculation(null); },
  });

  const createM = useMutation({
    mutationFn: () => ordersApi.create(cart),
    onSuccess: ({ order }) => nav(`/orders`),
  });

  const addItem = (menuItemId) => {
    const exists = cart.items.find(i => i.menuItemId === menuItemId);
    if (exists) {
      setCart({ ...cart, items: cart.items.map(i => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i) });
    } else {
      setCart({ ...cart, items: [...cart.items, { menuItemId, quantity: 1 }] });
    }
  };

  const updateQty = (menuItemId, qty) => {
    if (qty <= 0) {
      setCart({ ...cart, items: cart.items.filter(i => i.menuItemId !== menuItemId) });
    } else {
      setCart({ ...cart, items: cart.items.map(i => i.menuItemId === menuItemId ? { ...i, quantity: qty } : i) });
    }
  };

  return (
    <div>
      <PageHeader title="בניית הזמנה" subtitle="בחר לקוח, פריטים, חבילה וקופונים - וקבל חישוב חי" />

      <div className="grid grid-2">
        <div>
          <div className="card">
            <div className="card-title">פרטי הזמנה</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">לקוח</label>
                <select className="form-select" value={cart.customerId} onChange={e => setCart({ ...cart, customerId: e.target.value })}>
                  <option value="">בחר לקוח</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.priceList ? `(${c.priceList.name})` : ''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">תאריך אירוע</label>
                <input type="date" className="form-input" value={cart.eventDate} onChange={e => setCart({ ...cart, eventDate: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">מספר אורחים</label>
                <input type="number" className="form-input" value={cart.guestCount} onChange={e => setCart({ ...cart, guestCount: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label">חבילה</label>
                <select className="form-select" value={cart.packageId} onChange={e => setCart({ ...cart, packageId: e.target.value })}>
                  <option value="">ללא חבילה</option>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({fmt(p.basePrice)} + {fmt(p.pricePerGuest || 0)}/אורח)</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">קוד קופון</label>
                <input className="form-input" value={cart.couponCode} onChange={e => setCart({ ...cart, couponCode: e.target.value.toUpperCase() })}
                  placeholder="WELCOME10" style={{ fontFamily: 'monospace' }} />
              </div>
              <div className="form-group">
                <label className="form-label">מימוש נקודות {customer && `(זמין: ${customer.loyaltyPoints})`}</label>
                <input type="number" className="form-input" value={cart.loyaltyPointsToRedeem}
                  onChange={e => setCart({ ...cart, loyaltyPointsToRedeem: Number(e.target.value) })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">הערות</label>
              <textarea className="form-textarea" value={cart.notes} onChange={e => setCart({ ...cart, notes: e.target.value })} />
            </div>
          </div>

          <div className="card">
            <div className="card-title">פריטים נוספים</div>
            <div style={{ maxHeight: 250, overflowY: 'auto' }}>
              {items.map(it => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid #eee' }}>
                  <div>
                    <div>{it.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{fmt(it.basePrice)}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => addItem(it.id)}>+ הוסף</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-title">סל הזמנה ({cart.items.length} פריטים)</div>
            {cart.items.length === 0 && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 16 }}>הסל ריק</div>}
            {cart.items.map(ci => {
              const item = items.find(i => i.id === ci.menuItemId);
              if (!item) return null;
              return (
                <div key={ci.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderBottom: '1px solid #eee' }}>
                  <div style={{ flex: 1 }}>{item.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => updateQty(ci.menuItemId, ci.quantity - 1)}>-</button>
                    <span>{ci.quantity}</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => updateQty(ci.menuItemId, ci.quantity + 1)}>+</button>
                    <span style={{ width: 80, textAlign: 'left', fontWeight: 600 }}>{fmt(item.basePrice * ci.quantity)}</span>
                  </div>
                </div>
              );
            })}

            <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }}
              onClick={() => calcM.mutate()} disabled={!cart.customerId || (cart.items.length === 0 && !cart.packageId)}>
              חשב מחיר
            </button>

            {calcError && (
              <div style={{ marginTop: 12, padding: 12, background: '#fee2e2', borderRadius: 8, color: '#991b1b' }}>
                ⚠️ {calcError}
              </div>
            )}

            {calculation && (
              <div className="breakdown">
                <div className="breakdown-row">
                  <span>סכום פריטים</span>
                  <span>{fmt(calculation.subtotal - (calculation.packagePrice || 0))}</span>
                </div>
                {calculation.packagePrice > 0 && (
                  <div className="breakdown-row">
                    <span>חבילה</span>
                    <span>{fmt(calculation.packagePrice)}</span>
                  </div>
                )}
                <div className="breakdown-row">
                  <span><strong>סה"כ ביניים</strong></span>
                  <span><strong>{fmt(calculation.subtotal)}</strong></span>
                </div>
                {calculation.discounts.map((d, i) => (
                  <div key={i} className="breakdown-row discount">
                    <span>{d.label}</span>
                    <span>-{fmt(d.amount)}</span>
                  </div>
                ))}
                {calculation.loyaltyDiscount > 0 && (
                  <div className="breakdown-row discount">
                    <span>מימוש {calculation.pointsRedeemed} נקודות</span>
                    <span>-{fmt(calculation.loyaltyDiscount)}</span>
                  </div>
                )}
                <div className="breakdown-row total">
                  <span>לתשלום</span>
                  <span>{fmt(calculation.total)}</span>
                </div>
                {calculation.pointsToEarn > 0 && (
                  <div style={{ marginTop: 8, padding: 8, background: '#fef3c7', borderRadius: 6, fontSize: 13 }}>
                    ⭐ הלקוח יצבור {calculation.pointsToEarn} נקודות מהזמנה זו
                  </div>
                )}
                <button className="btn btn-success" style={{ width: '100%', marginTop: 12 }} onClick={() => createM.mutate()}>
                  ✓ צור הזמנה
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
