import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { priceListsApi, itemsApi } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { fmt } from '../components/Currency.jsx';

export default function PriceLists() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [openItem, setOpenItem] = useState(null);

  const { data: lists = [] } = useQuery({ queryKey: ['price-lists'], queryFn: priceListsApi.list });
  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: itemsApi.list });

  const saveM = useMutation({
    mutationFn: (data) => editing.id ? priceListsApi.update(editing.id, data) : priceListsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['price-lists'] }); setEditing(null); },
  });
  const delM = useMutation({
    mutationFn: (id) => priceListsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['price-lists'] }),
  });
  const setItemPriceM = useMutation({
    mutationFn: ({ listId, ...payload }) => priceListsApi.setItemPrice(listId, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['price-lists'] }); setOpenItem(null); },
  });

  return (
    <div>
      <PageHeader
        title="מחירונים B2B"
        subtitle="מחירונים שונים ללקוחות שונים"
        actions={<button className="btn btn-primary" onClick={() => setEditing({
          name: '', description: '', globalDiscount: 0, isActive: true,
        })}>+ מחירון חדש</button>}
      />

      <div className="grid grid-2">
        {lists.map(pl => (
          <div key={pl.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h3>{pl.name}</h3>
                {pl.description && <p style={{ color: '#6b7280', fontSize: 13 }}>{pl.description}</p>}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{pl.globalDiscount}%</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>הנחה גלובלית</div>
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
              {pl.itemPrices?.length || 0} פריטים עם מחיר מותאם אישית
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(pl)}>ערוך</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setOpenItem({ listId: pl.id, listName: pl.name })}>מחירי פריטים</button>
              <button className="btn btn-danger btn-sm" onClick={() => confirm('למחוק?') && delM.mutate(pl.id)}>מחק</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal
          title={editing.id ? 'עריכת מחירון' : 'מחירון חדש'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-primary" onClick={() => saveM.mutate({
                name: editing.name, description: editing.description,
                globalDiscount: Number(editing.globalDiscount), isActive: editing.isActive,
              })} disabled={!editing.name}>שמור</button>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>ביטול</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">שם המחירון</label>
            <input className="form-input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">תיאור</label>
            <textarea className="form-textarea" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">הנחה גלובלית (%)</label>
            <input type="number" className="form-input" value={editing.globalDiscount} onChange={e => setEditing({ ...editing, globalDiscount: e.target.value })} />
          </div>
        </Modal>
      )}

      {openItem && (
        <Modal title={`מחירי פריטים: ${openItem.listName}`} onClose={() => setOpenItem(null)}>
          <p style={{ marginBottom: 12, color: '#6b7280', fontSize: 13 }}>
            הזן מחיר מותאם או הנחה באחוזים לפריטים ספציפיים. אחרת תחול ההנחה הגלובלית.
          </p>
          <table className="table">
            <thead><tr><th>פריט</th><th>בסיס</th><th>מחיר מותאם</th><th>או הנחה %</th><th></th></tr></thead>
            <tbody>
              {items.map(it => {
                const key = `${openItem.listId}-${it.id}`;
                return (
                  <tr key={it.id}>
                    <td>{it.name}</td>
                    <td>{fmt(it.basePrice)}</td>
                    <td><input type="number" className="form-input" id={`p-${key}`} placeholder="—" style={{ width: 100 }} /></td>
                    <td><input type="number" className="form-input" id={`d-${key}`} placeholder="—" style={{ width: 80 }} /></td>
                    <td><button className="btn btn-primary btn-sm" onClick={() => {
                      const cp = document.getElementById(`p-${key}`).value;
                      const dc = document.getElementById(`d-${key}`).value;
                      setItemPriceM.mutate({
                        listId: openItem.listId,
                        menuItemId: it.id,
                        customPrice: cp ? Number(cp) : null,
                        discount: dc ? Number(dc) : null,
                      });
                    }}>שמור</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}
