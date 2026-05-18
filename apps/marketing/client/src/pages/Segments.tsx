import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface RuleNode {
  op: 'AND' | 'OR';
  children: any[];
}

export function Segments() {
  const qc = useQueryClient();
  const segments = useQuery({ queryKey: ['segments'], queryFn: async () => (await api.get('/segments')).data });
  const [editing, setEditing] = useState<any | null>(null);

  const save = useMutation({
    mutationFn: async (s: any) =>
      s.id ? (await api.put(`/segments/${s.id}`, s)).data : (await api.post('/segments', s)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['segments'] }); setEditing(null); },
  });

  return (
    <>
      <div className="page-header">
        <h2>סגמנטים</h2>
        <button className="primary" onClick={() => setEditing({ name: '', type: 'DYNAMIC', rules: { op: 'AND', children: [] } })}>סגמנט חדש</button>
      </div>

      {editing ? (
        <SegmentEditor
          value={editing}
          onCancel={() => setEditing(null)}
          onSave={(s) => save.mutate(s)}
        />
      ) : (
        <div className="card">
          <table>
            <thead><tr><th>שם</th><th>סוג</th><th>חברים</th><th>עודכן</th><th></th></tr></thead>
            <tbody>
              {segments.data?.items.map((s: any) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.type === 'DYNAMIC' ? 'דינמי' : 'סטטי'}</td>
                  <td>{s.memberCount}</td>
                  <td>{new Date(s.updatedAt).toLocaleDateString('he-IL')}</td>
                  <td>
                    <button onClick={() => setEditing(s)}>עריכה</button>
                    <button onClick={async () => { await api.post(`/segments/${s.id}/evaluate`); qc.invalidateQueries({ queryKey: ['segments'] }); }}>חישוב מחדש</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function SegmentEditor({ value, onCancel, onSave }: { value: any; onCancel: () => void; onSave: (v: any) => void }) {
  const [s, setS] = useState(value);
  const [preview, setPreview] = useState<{ count: number } | null>(null);

  async function runPreview() {
    const { data } = await api.post('/segments/preview', { rules: s.rules });
    setPreview(data);
  }

  return (
    <div className="card">
      <div className="flex" style={{ marginBottom: 16 }}>
        <input placeholder="שם הסגמנט" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
        <select value={s.type} onChange={(e) => setS({ ...s, type: e.target.value })}>
          <option value="DYNAMIC">דינמי</option>
          <option value="STATIC">סטטי</option>
        </select>
      </div>
      <h4>חוקים</h4>
      <RuleNodeEditor node={s.rules} onChange={(rules) => setS({ ...s, rules })} />
      <div className="flex" style={{ marginTop: 16 }}>
        <button onClick={runPreview}>תצוגה מקדימה (חישוב חברים)</button>
        {preview && <span className="muted">סך לידים מתאימים: <b>{preview.count}</b></span>}
        <div className="spacer" />
        <button onClick={onCancel}>ביטול</button>
        <button className="primary" onClick={() => onSave(s)}>שמירה</button>
      </div>
    </div>
  );
}

function RuleNodeEditor({ node, onChange }: { node: RuleNode; onChange: (n: RuleNode) => void }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div className="flex">
        <select value={node.op} onChange={(e) => onChange({ ...node, op: e.target.value as any })}>
          <option value="AND">וגם (AND)</option>
          <option value="OR">או (OR)</option>
        </select>
        <button onClick={() => onChange({ ...node, children: [...node.children, { field: 'status', op: 'eq', value: 'NEW' }] })}>+ חוק</button>
        <button onClick={() => onChange({ ...node, children: [...node.children, { op: 'AND', children: [] }] })}>+ קבוצה</button>
      </div>
      {node.children.map((c: any, i: number) => (
        <div key={i} style={{ marginTop: 8, paddingRight: 16 }}>
          {c.children ? (
            <RuleNodeEditor
              node={c}
              onChange={(updated) => {
                const arr = [...node.children]; arr[i] = updated; onChange({ ...node, children: arr });
              }}
            />
          ) : (
            <RuleRow rule={c} onChange={(r) => {
              const arr = [...node.children]; arr[i] = r; onChange({ ...node, children: arr });
            }} onDelete={() => {
              const arr = node.children.filter((_, j) => j !== i); onChange({ ...node, children: arr });
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

function RuleRow({ rule, onChange, onDelete }: { rule: any; onChange: (r: any) => void; onDelete: () => void }) {
  return (
    <div className="flex">
      <select value={rule.field} onChange={(e) => onChange({ ...rule, field: e.target.value })}>
        <option value="status">סטטוס</option>
        <option value="score">ציון</option>
        <option value="tags">תגית</option>
        <option value="language">שפה</option>
        <option value="source">מקור</option>
        <option value="createdAt">תאריך יצירה</option>
        <option value="event.purchase">היה רכישה</option>
        <option value="attributes.city">עיר</option>
      </select>
      <select value={rule.op} onChange={(e) => onChange({ ...rule, op: e.target.value })}>
        <option value="eq">שווה</option>
        <option value="neq">שונה</option>
        <option value="gt">גדול מ</option>
        <option value="gte">גדול/שווה</option>
        <option value="lt">קטן מ</option>
        <option value="lte">קטן/שווה</option>
        <option value="contains">מכיל</option>
        <option value="tag">תגית קיימת</option>
        <option value="hasEvent">היה אירוע</option>
      </select>
      <input style={{ flex: 1 }} value={rule.value ?? ''} onChange={(e) => onChange({ ...rule, value: e.target.value })} />
      <button onClick={onDelete}>×</button>
    </div>
  );
}
