import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, priceListsApi } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';

const TYPES = [
  { value: 'PRIVATE', label: 'פרטי' },
  { value: 'BUSINESS', label: 'עסקי' },
  { value: 'HOTEL', label: 'מלון' },
  { value: 'VIP', label: 'VIP' },
];

const TIER_LABEL = { BRONZE: 'ארד', SILVER: 'כסף', GOLD: 'זהב', PLATINUM: 'פלטינום' };

export default function Customers() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });
  const { data: priceLists = [] } = useQuery({ queryKey: ['price-lists'], queryFn: priceListsApi.list });

  const saveM = useMutation({
    mutationFn: (data) => editing.id ? customersApi.update(editing.id, data) : customersApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setEditing(null); },
  });
  const delM = useMutation({
    mutationFn: (id) => customersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  return (
    <div>
      <PageHeader
        title="לקוחות"
        actions={<button className="btn btn-primary" onClick={() => setEditing({
          name: '', email: '', phone: '', type: 'PRIVATE', priceListId: null,
        })}>+ לקוח חדש</button>}
      />

      <table className="table">
        <thead>
          <tr><th>שם</th><th>סוג</th><th>אימייל</th><th>טלפון</th><th>מחירון</th><th>נקודות</th><th>רמה</th><th></th></tr>
        </thead>
        <tbody>
          {customers.map(c => (
            <tr key={c.id}>
              <td><strong>{c.name}</strong></td>
              <td><span className="badge badge-primary">{TYPES.find(t => t.value === c.type)?.label}</span></td>
              <td>{c.email}</td>
              <td>{c.phone || '—'}</td>
              <td>{c.priceList?.name || '—'}</td>
              <td>{c.loyaltyPoints}</td>
              <td><span className="badge badge-gold">{TIER_LABEL[c.loyaltyTier]}</span></td>
              <td>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(c)}>ערוך</button>
                <button className="btn btn-danger btn-sm" onClick={() => confirm('למחוק?') && delM.mutate(c.id)}>מחק</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <Modal
          title={editing.id ? 'עריכת לקוח' : 'לקוח חדש'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-primary" onClick={() => saveM.mutate({
                name: editing.name, email: editing.email, phone: editing.phone || undefined,
                type: editing.type, priceListId: editing.priceListId || null,
              })} disabled={!editing.name || !editing.email}>שמור</button>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>ביטול</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">שם</label>
            <input className="form-input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">אימייל</label>
              <input type="email" className="form-input" value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">טלפון</label>
              <input className="form-input" value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">סוג</label>
              <select className="form-select" value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })}>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">מחירון</label>
              <select className="form-select" value={editing.priceListId || ''} onChange={e => setEditing({ ...editing, priceListId: e.target.value || null })}>
                <option value="">ברירת מחדל</option>
                {priceLists.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
