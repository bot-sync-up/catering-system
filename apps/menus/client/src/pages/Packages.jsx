import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { packagesApi, itemsApi } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { fmt } from '../components/Currency.jsx';

const TYPES = [
  { value: 'WEDDING', label: 'חתונה' },
  { value: 'VIP', label: 'VIP' },
  { value: 'BAR_MITZVAH', label: 'בר מצווה' },
  { value: 'BUSINESS', label: 'עסקי' },
  { value: 'CUSTOM', label: 'מותאם' },
];

export default function Packages() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: packages = [] } = useQuery({ queryKey: ['packages'], queryFn: packagesApi.list });
  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: itemsApi.list });

  const saveM = useMutation({
    mutationFn: (data) => editing.id
      ? packagesApi.update(editing.id, data)
      : packagesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages'] });
      setEditing(null);
    },
  });

  const delM = useMutation({
    mutationFn: (id) => packagesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['packages'] }),
  });

  const handleSave = () => {
    saveM.mutate({
      name: editing.name,
      description: editing.description,
      type: editing.type,
      basePrice: Number(editing.basePrice),
      pricePerGuest: Number(editing.pricePerGuest || 0),
      minGuests: Number(editing.minGuests || 1),
      maxGuests: editing.maxGuests ? Number(editing.maxGuests) : null,
      isActive: editing.isActive,
      items: editing.items,
    });
  };

  const newPkg = () => setEditing({
    name: '', type: 'WEDDING', basePrice: 0, pricePerGuest: 0,
    minGuests: 1, isActive: true, items: [],
  });

  return (
    <div>
      <PageHeader
        title="חבילות אירועים"
        subtitle="חבילות מוכנות לחתונות, VIP, ועוד"
        actions={<button className="btn btn-primary" onClick={newPkg}>+ חבילה חדשה</button>}
      />

      <div className="grid grid-2">
        {packages.map(pkg => (
          <div key={pkg.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h3>{pkg.name}</h3>
                <span className="badge badge-primary">{TYPES.find(t => t.value === pkg.type)?.label || pkg.type}</span>
              </div>
              {!pkg.isActive && <span className="badge badge-danger">לא פעיל</span>}
            </div>
            {pkg.description && <p style={{ color: '#6b7280', fontSize: 13 }}>{pkg.description}</p>}
            <div style={{ marginTop: 12, fontSize: 14 }}>
              <div>💰 בסיס: <strong>{fmt(pkg.basePrice)}</strong></div>
              {pkg.pricePerGuest > 0 && <div>👤 לאורח: <strong>{fmt(pkg.pricePerGuest)}</strong></div>}
              <div>👥 מינימום: {pkg.minGuests} {pkg.maxGuests ? `· מקסימום: ${pkg.maxGuests}` : ''}</div>
              <div>🥘 כולל: {pkg.items?.length || 0} פריטים</div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing({
                ...pkg,
                items: pkg.items?.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })) || [],
              })}>ערוך</button>
              <button className="btn btn-danger btn-sm" onClick={() => confirm('למחוק?') && delM.mutate(pkg.id)}>מחק</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal
          title={editing.id ? 'עריכת חבילה' : 'חבילה חדשה'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-primary" onClick={handleSave} disabled={!editing.name}>שמור</button>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>ביטול</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">שם החבילה</label>
            <input className="form-input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">סוג</label>
              <select className="form-select" value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">מחיר בסיס</label>
              <input type="number" className="form-input" value={editing.basePrice} onChange={e => setEditing({ ...editing, basePrice: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">מחיר לאורח</label>
              <input type="number" className="form-input" value={editing.pricePerGuest || 0} onChange={e => setEditing({ ...editing, pricePerGuest: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">מינ' אורחים</label>
              <input type="number" className="form-input" value={editing.minGuests} onChange={e => setEditing({ ...editing, minGuests: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">מקס' אורחים</label>
              <input type="number" className="form-input" value={editing.maxGuests || ''} onChange={e => setEditing({ ...editing, maxGuests: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">פריטים בחבילה</label>
            {(editing.items || []).map((it, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <select className="form-select" value={it.menuItemId} onChange={e => {
                  const items = [...editing.items]; items[idx].menuItemId = e.target.value;
                  setEditing({ ...editing, items });
                }}>
                  <option value="">בחר פריט</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <input type="number" className="form-input" style={{ width: 80 }} value={it.quantity} onChange={e => {
                  const items = [...editing.items]; items[idx].quantity = Number(e.target.value);
                  setEditing({ ...editing, items });
                }} />
                <button className="btn btn-danger btn-sm" onClick={() => setEditing({
                  ...editing, items: editing.items.filter((_, i) => i !== idx),
                })}>X</button>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing({
              ...editing, items: [...(editing.items || []), { menuItemId: '', quantity: 1 }],
            })}>+ הוסף פריט</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
