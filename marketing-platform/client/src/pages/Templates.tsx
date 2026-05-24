import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { TemplateBuilder } from '../components/TemplateBuilder';

export function Templates() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['templates'], queryFn: async () => (await api.get('/templates')).data });
  const [editing, setEditing] = useState<any | null>(null);

  const save = useMutation({
    mutationFn: async (t: any) =>
      t.id ? (await api.put(`/templates/${t.id}`, t)).data : (await api.post('/templates', t)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); setEditing(null); },
  });

  return (
    <>
      <div className="page-header">
        <h2>תבניות</h2>
        <button className="primary" onClick={() => setEditing({ name: '', channel: 'EMAIL', subject: '', body: '', design: { blocks: [] } })}>תבנית חדשה</button>
      </div>

      {editing ? (
        <TemplateBuilder value={editing} onCancel={() => setEditing(null)} onSave={(t) => save.mutate(t)} />
      ) : (
        <div className="card">
          <table>
            <thead><tr><th>שם</th><th>ערוץ</th><th>נושא</th><th>עודכן</th><th></th></tr></thead>
            <tbody>
              {list.data?.items.map((t: any) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.channel}</td>
                  <td>{t.subject ?? '—'}</td>
                  <td>{new Date(t.updatedAt).toLocaleDateString('he-IL')}</td>
                  <td><button onClick={() => setEditing(t)}>עריכה</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
