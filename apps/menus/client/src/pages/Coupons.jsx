import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponsApi } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { fmt } from '../components/Currency.jsx';

export default function Coupons() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: coupons = [] } = useQuery({ queryKey: ['coupons'], queryFn: couponsApi.list });

  const saveM = useMutation({
    mutationFn: (data) => editing.id ? couponsApi.update(editing.id, data) : couponsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coupons'] }); setEditing(null); },
  });
  const delM = useMutation({
    mutationFn: (id) => couponsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });

  const newCoupon = () => setEditing({
    code: '', name: '', type: 'PERCENTAGE', value: 10,
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    isActive: true,
  });

  return (
    <div>
      <PageHeader
        title="קופונים"
        subtitle="ניהול קופונים ומבצעים"
        actions={<button className="btn btn-primary" onClick={newCoupon}>+ קופון חדש</button>}
      />

      <table className="table">
        <thead>
          <tr>
            <th>קוד</th><th>שם</th><th>סוג</th><th>ערך</th><th>תוקף</th><th>שימושים</th><th>סטטוס</th><th></th>
          </tr>
        </thead>
        <tbody>
          {coupons.map(c => (
            <tr key={c.id}>
              <td><strong style={{ fontFamily: 'monospace' }}>{c.code}</strong></td>
              <td>{c.name}</td>
              <td>{c.type === 'PERCENTAGE' ? 'אחוזים' : 'סכום קבוע'}</td>
              <td><strong>{c.type === 'PERCENTAGE' ? `${c.value}%` : fmt(c.value)}</strong></td>
              <td style={{ fontSize: 12 }}>
                {new Date(c.validFrom).toLocaleDateString('he-IL')} - {new Date(c.validUntil).toLocaleDateString('he-IL')}
              </td>
              <td>{c.usesCount} {c.maxUses ? `/ ${c.maxUses}` : ''}</td>
              <td>{c.isActive ? <span className="badge badge-success">פעיל</span> : <span className="badge badge-danger">לא פעיל</span>}</td>
              <td>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing({
                  ...c,
                  validFrom: new Date(c.validFrom).toISOString().slice(0, 10),
                  validUntil: new Date(c.validUntil).toISOString().slice(0, 10),
                })}>ערוך</button>
                <button className="btn btn-danger btn-sm" onClick={() => confirm('למחוק?') && delM.mutate(c.id)}>מחק</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <Modal
          title={editing.id ? 'עריכת קופון' : 'קופון חדש'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-primary" onClick={() => saveM.mutate({
                code: editing.code.toUpperCase(),
                name: editing.name,
                description: editing.description,
                type: editing.type,
                value: Number(editing.value),
                minOrderAmount: editing.minOrderAmount ? Number(editing.minOrderAmount) : null,
                maxDiscount: editing.maxDiscount ? Number(editing.maxDiscount) : null,
                validFrom: editing.validFrom,
                validUntil: editing.validUntil,
                maxUses: editing.maxUses ? Number(editing.maxUses) : null,
                perCustomerLimit: editing.perCustomerLimit ? Number(editing.perCustomerLimit) : null,
                isActive: editing.isActive,
              })} disabled={!editing.code || !editing.name}>שמור</button>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>ביטול</button>
            </>
          }
        >
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">קוד קופון</label>
              <input className="form-input" value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                style={{ fontFamily: 'monospace' }} />
            </div>
            <div className="form-group">
              <label className="form-label">שם</label>
              <input className="form-input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">סוג</label>
              <select className="form-select" value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })}>
                <option value="PERCENTAGE">הנחה באחוזים</option>
                <option value="FIXED_AMOUNT">סכום קבוע</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">ערך</label>
              <input type="number" className="form-input" value={editing.value} onChange={e => setEditing({ ...editing, value: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">תוקף מ-</label>
              <input type="date" className="form-input" value={editing.validFrom} onChange={e => setEditing({ ...editing, validFrom: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">עד</label>
              <input type="date" className="form-input" value={editing.validUntil} onChange={e => setEditing({ ...editing, validUntil: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">מינ' הזמנה</label>
              <input type="number" className="form-input" value={editing.minOrderAmount || ''} onChange={e => setEditing({ ...editing, minOrderAmount: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">תקרת הנחה</label>
              <input type="number" className="form-input" value={editing.maxDiscount || ''} onChange={e => setEditing({ ...editing, maxDiscount: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">מקס' שימושים</label>
              <input type="number" className="form-input" value={editing.maxUses || ''} onChange={e => setEditing({ ...editing, maxUses: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">מקס' ללקוח</label>
              <input type="number" className="form-input" value={editing.perCustomerLimit || ''} onChange={e => setEditing({ ...editing, perCustomerLimit: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={editing.isActive} onChange={e => setEditing({ ...editing, isActive: e.target.checked })} />
              {' '}פעיל
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
