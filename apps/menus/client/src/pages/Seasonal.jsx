import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seasonalApi, itemsApi } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { fmt } from '../components/Currency.jsx';

export default function Seasonal() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: pricings = [] } = useQuery({ queryKey: ['seasonal'], queryFn: seasonalApi.list });
  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: itemsApi.list });

  const saveM = useMutation({
    mutationFn: (data) => editing.id ? seasonalApi.update(editing.id, data) : seasonalApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seasonal'] }); setEditing(null); },
  });
  const delM = useMutation({
    mutationFn: (id) => seasonalApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seasonal'] }),
  });

  const newP = () => setEditing({
    name: '', menuItemId: null, multiplier: 1.1, fixedPrice: null,
    validFrom: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    isActive: true, priority: 0,
  });

  return (
    <div>
      <PageHeader
        title="תמחור עונתי"
        subtitle="מחירים שונים לחגים, עונות ותקופות שיא"
        actions={<button className="btn btn-primary" onClick={newP}>+ תקופה חדשה</button>}
      />

      <table className="table">
        <thead>
          <tr><th>שם</th><th>חל על</th><th>שינוי מחיר</th><th>תוקף</th><th>עדיפות</th><th>סטטוס</th><th></th></tr>
        </thead>
        <tbody>
          {pricings.map(p => (
            <tr key={p.id}>
              <td><strong>{p.name}</strong></td>
              <td>{p.menuItem?.name || <em>כל הפריטים</em>}</td>
              <td>
                {p.fixedPrice != null
                  ? <span>מחיר קבוע: {fmt(p.fixedPrice)}</span>
                  : <span style={{ color: p.multiplier > 1 ? '#ef4444' : '#10b981' }}>
                      ×{p.multiplier} ({p.multiplier > 1 ? '+' : ''}{Math.round((p.multiplier - 1) * 100)}%)
                    </span>
                }
              </td>
              <td style={{ fontSize: 12 }}>
                {new Date(p.validFrom).toLocaleDateString('he-IL')} - {new Date(p.validUntil).toLocaleDateString('he-IL')}
              </td>
              <td>{p.priority}</td>
              <td>{p.isActive ? <span className="badge badge-success">פעיל</span> : <span className="badge badge-danger">לא</span>}</td>
              <td>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing({
                  ...p,
                  validFrom: new Date(p.validFrom).toISOString().slice(0, 10),
                  validUntil: new Date(p.validUntil).toISOString().slice(0, 10),
                })}>ערוך</button>
                <button className="btn btn-danger btn-sm" onClick={() => confirm('למחוק?') && delM.mutate(p.id)}>מחק</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <Modal
          title={editing.id ? 'עריכת תקופה' : 'תקופת תמחור חדשה'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-primary" onClick={() => saveM.mutate({
                name: editing.name,
                menuItemId: editing.menuItemId || null,
                multiplier: Number(editing.multiplier),
                fixedPrice: editing.fixedPrice ? Number(editing.fixedPrice) : null,
                validFrom: editing.validFrom,
                validUntil: editing.validUntil,
                isActive: editing.isActive,
                priority: Number(editing.priority || 0),
              })} disabled={!editing.name}>שמור</button>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>ביטול</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">שם התקופה</label>
            <input className="form-input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">חל על פריט (ריק = כל הפריטים)</label>
            <select className="form-select" value={editing.menuItemId || ''} onChange={e => setEditing({ ...editing, menuItemId: e.target.value || null })}>
              <option value="">כל הפריטים</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">כפל מחיר (1.1 = +10%)</label>
              <input type="number" step="0.05" className="form-input" value={editing.multiplier}
                onChange={e => setEditing({ ...editing, multiplier: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">מחיר קבוע (אופציונלי)</label>
              <input type="number" className="form-input" value={editing.fixedPrice || ''}
                onChange={e => setEditing({ ...editing, fixedPrice: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">מתאריך</label>
              <input type="date" className="form-input" value={editing.validFrom}
                onChange={e => setEditing({ ...editing, validFrom: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">עד תאריך</label>
              <input type="date" className="form-input" value={editing.validUntil}
                onChange={e => setEditing({ ...editing, validUntil: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">עדיפות (גבוה יותר = מנצח)</label>
              <input type="number" className="form-input" value={editing.priority}
                onChange={e => setEditing({ ...editing, priority: e.target.value })} />
            </div>
            <div className="form-group" style={{ alignSelf: 'end' }}>
              <label>
                <input type="checkbox" checked={editing.isActive} onChange={e => setEditing({ ...editing, isActive: e.target.checked })} />
                {' '}פעיל
              </label>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
