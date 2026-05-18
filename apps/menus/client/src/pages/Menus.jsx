import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menusApi } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';

export default function Menus() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', isTemplate: false });

  const { data: menus = [], isLoading } = useQuery({ queryKey: ['menus'], queryFn: menusApi.list });

  const createM = useMutation({
    mutationFn: () => menusApi.create(form),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ['menus'] });
      setOpenNew(false);
      setForm({ name: '', description: '', isTemplate: false });
      nav(`/menus/${m.id}/builder`);
    },
  });

  const dupM = useMutation({
    mutationFn: (id) => menusApi.duplicate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menus'] }),
  });

  const delM = useMutation({
    mutationFn: (id) => menusApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menus'] }),
  });

  return (
    <div>
      <PageHeader
        title="תפריטים"
        subtitle="ניהול ועריכת תפריטים דינמיים"
        actions={<button className="btn btn-primary" onClick={() => setOpenNew(true)}>+ תפריט חדש</button>}
      />

      {isLoading && <div className="loading">טוען...</div>}

      {!isLoading && menus.length === 0 && (
        <EmptyState icon="🍽️" title="אין תפריטים עדיין" subtitle="צור את התפריט הראשון שלך" />
      )}

      <div className="grid grid-3">
        {menus.map(m => {
          const itemsCount = m.categories?.reduce((s, c) => s + (c.items?.length || 0), 0);
          return (
            <div key={m.id} className="card" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ marginBottom: 4 }}>{m.name}</h3>
                {m.isTemplate && <span className="badge badge-primary">תבנית</span>}
              </div>
              {m.description && <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>{m.description}</p>}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, fontSize: 13 }}>
                <span>📂 {m.categories?.length || 0} קטגוריות</span>
                <span>•</span>
                <span>🥘 {itemsCount} מנות</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => nav(`/menus/${m.id}/builder`)}>ערוך</button>
                <button className="btn btn-secondary btn-sm" onClick={() => dupM.mutate(m.id)}>שכפל</button>
                <button className="btn btn-danger btn-sm" onClick={() => confirm('למחוק תפריט זה?') && delM.mutate(m.id)}>מחק</button>
              </div>
            </div>
          );
        })}
      </div>

      {openNew && (
        <Modal
          title="תפריט חדש"
          onClose={() => setOpenNew(false)}
          footer={
            <>
              <button className="btn btn-primary" onClick={() => createM.mutate()} disabled={!form.name}>צור ועבור לבנייה</button>
              <button className="btn btn-secondary" onClick={() => setOpenNew(false)}>ביטול</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">שם התפריט</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">תיאור</label>
            <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={form.isTemplate} onChange={e => setForm({ ...form, isTemplate: e.target.checked })} />
              {' '}תבנית בסיס (לשכפול עתידי)
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
