import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi, allergiesApi, dietsApi, menusApi } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { fmt } from '../components/Currency.jsx';

export default function Items() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: itemsApi.list });
  const { data: allergies = [] } = useQuery({ queryKey: ['allergies'], queryFn: allergiesApi.list });
  const { data: diets = [] } = useQuery({ queryKey: ['diets'], queryFn: dietsApi.list });
  const { data: menus = [] } = useQuery({ queryKey: ['menus'], queryFn: menusApi.list });

  const allCategories = menus.flatMap(m => m.categories.map(c => ({ ...c, menuName: m.name })));

  const saveM = useMutation({
    mutationFn: (data) => editing.id
      ? itemsApi.update(editing.id, data)
      : itemsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['menus'] });
      setEditing(null);
    },
  });

  const delM = useMutation({
    mutationFn: (id) => itemsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });

  const handleSave = () => {
    saveM.mutate({
      name: editing.name,
      description: editing.description,
      basePrice: Number(editing.basePrice),
      categoryId: editing.categoryId,
      isAvailable: editing.isAvailable,
      allergyIds: editing.allergyIds,
      dietIds: editing.dietIds,
    });
  };

  return (
    <div>
      <PageHeader
        title="קטלוג מנות"
        subtitle="ניהול כל המנות במערכת"
        actions={<button className="btn btn-primary" onClick={() => setEditing({
          name: '', description: '', basePrice: 0, categoryId: allCategories[0]?.id || '',
          isAvailable: true, allergyIds: [], dietIds: [],
        })}>+ מנה חדשה</button>}
      />

      <table className="table">
        <thead>
          <tr>
            <th>שם המנה</th>
            <th>קטגוריה</th>
            <th>מחיר בסיס</th>
            <th>אלרגנים</th>
            <th>דיאטות</th>
            <th>זמין</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id}>
              <td><strong>{it.name}</strong></td>
              <td>{it.category?.name || '—'}</td>
              <td>{fmt(it.basePrice)}</td>
              <td>{it.allergies?.map(a => <span key={a.allergyId} className="chip chip-allergy">{a.allergy?.name}</span>)}</td>
              <td>{it.diets?.map(d => <span key={d.dietId} className="chip chip-diet">{d.diet?.name}</span>)}</td>
              <td>{it.isAvailable ? <span className="badge badge-success">זמין</span> : <span className="badge badge-danger">לא זמין</span>}</td>
              <td>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing({
                  ...it,
                  allergyIds: it.allergies?.map(a => a.allergyId) || [],
                  dietIds: it.diets?.map(d => d.dietId) || [],
                })}>ערוך</button>
                <button className="btn btn-danger btn-sm" onClick={() => confirm('למחוק?') && delM.mutate(it.id)}>מחק</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <Modal
          title={editing.id ? 'עריכת מנה' : 'מנה חדשה'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn btn-primary" onClick={handleSave} disabled={!editing.name || !editing.categoryId}>שמור</button>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>ביטול</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">שם המנה</label>
            <input className="form-input" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">מחיר בסיס (₪)</label>
              <input type="number" className="form-input" value={editing.basePrice} onChange={e => setEditing({ ...editing, basePrice: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">קטגוריה</label>
              <select className="form-select" value={editing.categoryId || ''} onChange={e => setEditing({ ...editing, categoryId: e.target.value })}>
                <option value="">בחר קטגוריה</option>
                {allCategories.map(c => <option key={c.id} value={c.id}>{c.menuName} → {c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">תיאור</label>
            <textarea className="form-textarea" value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">אלרגנים</label>
            <div>
              {allergies.map(a => {
                const sel = editing.allergyIds?.includes(a.id);
                return (
                  <span key={a.id} className={`chip ${sel ? 'selected' : 'chip-allergy'}`} style={{ cursor: 'pointer' }}
                    onClick={() => setEditing({
                      ...editing,
                      allergyIds: sel ? editing.allergyIds.filter(x => x !== a.id) : [...editing.allergyIds, a.id],
                    })}>
                    {a.icon} {a.name}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">דיאטות מתאימות</label>
            <div>
              {diets.map(d => {
                const sel = editing.dietIds?.includes(d.id);
                return (
                  <span key={d.id} className={`chip ${sel ? 'selected' : 'chip-diet'}`} style={{ cursor: 'pointer' }}
                    onClick={() => setEditing({
                      ...editing,
                      dietIds: sel ? editing.dietIds.filter(x => x !== d.id) : [...editing.dietIds, d.id],
                    })}>
                    {d.name}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={editing.isAvailable} onChange={e => setEditing({ ...editing, isAvailable: e.target.checked })} />
              {' '}המנה זמינה למכירה
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
