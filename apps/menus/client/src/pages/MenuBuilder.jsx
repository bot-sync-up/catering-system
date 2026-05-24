import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { menusApi, itemsApi } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import { fmt } from '../components/Currency.jsx';

const CATEGORY_TYPES = [
  { value: 'STARTER', label: 'ראשונה' },
  { value: 'MAIN', label: 'עיקרית' },
  { value: 'SIDE', label: 'תוספת' },
  { value: 'DESSERT', label: 'קינוח' },
  { value: 'DRINK', label: 'שתייה' },
];

export default function MenuBuilder() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: menu, isLoading } = useQuery({ queryKey: ['menu', id], queryFn: () => menusApi.get(id) });
  const { data: allItems = [] } = useQuery({ queryKey: ['items'], queryFn: itemsApi.list });

  const [newCat, setNewCat] = useState({ name: '', type: 'MAIN' });

  const addCatM = useMutation({
    mutationFn: () => menusApi.addCategory(id, { ...newCat, order: (menu?.categories?.length || 0) + 1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu', id] });
      setNewCat({ name: '', type: 'MAIN' });
    },
  });
  const delCatM = useMutation({
    mutationFn: (catId) => menusApi.removeCategory(catId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu', id] }),
  });
  const updateItemM = useMutation({
    mutationFn: ({ itemId, payload }) => itemsApi.update(itemId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu', id] });
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });

  if (isLoading || !menu) return <div className="loading">טוען...</div>;

  // פריטים שלא משויכים לקטגוריה במנו הנוכחי
  const usedIds = new Set(menu.categories.flatMap(c => c.items.map(i => i.id)));
  const poolItems = allItems.filter(i => !usedIds.has(i.id));

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    // מ-pool לקטגוריה
    if (source.droppableId === 'pool' && destination.droppableId !== 'pool') {
      updateItemM.mutate({
        itemId: draggableId,
        payload: { categoryId: destination.droppableId, order: destination.index },
      });
      return;
    }

    // בין קטגוריות
    if (source.droppableId !== destination.droppableId && destination.droppableId !== 'pool') {
      updateItemM.mutate({
        itemId: draggableId,
        payload: { categoryId: destination.droppableId, order: destination.index },
      });
      return;
    }

    // סדר חדש בתוך קטגוריה
    if (source.droppableId === destination.droppableId) {
      updateItemM.mutate({
        itemId: draggableId,
        payload: { order: destination.index },
      });
    }
  };

  return (
    <div>
      <PageHeader
        title={`עריכה: ${menu.name}`}
        subtitle="גרור פריטים מהמאגר אל קטגוריות התפריט"
        actions={<button className="btn btn-secondary" onClick={() => nav('/menus')}>חזרה לרשימה</button>}
      />

      <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
          <label className="form-label">שם הקטגוריה</label>
          <input className="form-input" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} placeholder="למשל: ראשונות חמות" />
        </div>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label className="form-label">סוג</label>
          <select className="form-select" value={newCat.type} onChange={e => setNewCat({ ...newCat, type: e.target.value })}>
            {CATEGORY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => addCatM.mutate()} disabled={!newCat.name}>+ הוסף קטגוריה</button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="menu-builder">
          <div>
            <h3 style={{ marginBottom: 12 }}>📦 מאגר מנות ({poolItems.length})</h3>
            <Droppable droppableId="pool">
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="dnd-pool">
                  {poolItems.map((it, idx) => (
                    <Draggable key={it.id} draggableId={it.id} index={idx}>
                      {(p, snap) => (
                        <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                          className={`dnd-item ${snap.isDragging ? 'dragging' : ''}`}>
                          <div>
                            <div className="dnd-item-name">{it.name}</div>
                            {it.category && <div style={{ fontSize: 11, color: '#9ca3af' }}>{it.category.name}</div>}
                          </div>
                          <div className="dnd-item-price">{fmt(it.basePrice)}</div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {poolItems.length === 0 && <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>כל המנות שובצו</div>}
                </div>
              )}
            </Droppable>
          </div>

          <div className="dnd-categories">
            {menu.categories.map(cat => (
              <Droppable key={cat.id} droppableId={cat.id}>
                {(provided, snap) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className={`dnd-category ${snap.isDraggingOver ? 'dragging-over' : ''}`}>
                    <div className="dnd-category-header">
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 16 }}>{cat.name}</span>
                        <span style={{ fontSize: 12, color: '#9ca3af', marginRight: 8 }}>
                          ({CATEGORY_TYPES.find(t => t.value === cat.type)?.label})
                        </span>
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={() => confirm('למחוק קטגוריה?') && delCatM.mutate(cat.id)}>מחק</button>
                    </div>
                    {cat.items.map((it, idx) => (
                      <Draggable key={it.id} draggableId={it.id} index={idx}>
                        {(p, snap2) => (
                          <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                            className={`dnd-item ${snap2.isDragging ? 'dragging' : ''}`}>
                            <div>
                              <div className="dnd-item-name">{it.name}</div>
                              <div style={{ fontSize: 11 }}>
                                {it.allergies?.map(a => <span key={a.allergyId} className="chip chip-allergy">{a.allergy?.name}</span>)}
                                {it.diets?.map(d => <span key={d.dietId} className="chip chip-diet">{d.diet?.name}</span>)}
                              </div>
                            </div>
                            <div className="dnd-item-price">{fmt(it.basePrice)}</div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {cat.items.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#cbd5e1', padding: 12, fontSize: 13 }}>גרור פריטים לכאן</div>
                    )}
                  </div>
                )}
              </Droppable>
            ))}
            {menu.categories.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>הוסף קטגוריה ראשונה למעלה</div>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
