import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function Tickets() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>('');
  const [selected, setSelected] = useState<string | null>(null);

  const list = useQuery({ queryKey: ['tickets', status], queryFn: async () => (await api.get('/tickets', { params: { status: status || undefined } })).data });
  const detail = useQuery({
    queryKey: ['ticket', selected],
    queryFn: async () => (await api.get(`/tickets/${selected}`)).data,
    enabled: !!selected,
  });

  const update = useMutation({
    mutationFn: async (data: any) => (await api.patch(`/tickets/${selected}`, data)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ticket', selected] }); qc.invalidateQueries({ queryKey: ['tickets'] }); },
  });
  const [reply, setReply] = useState('');
  const comment = useMutation({
    mutationFn: async () => (await api.post(`/tickets/${selected}/comments`, { body: reply })).data,
    onSuccess: () => { setReply(''); qc.invalidateQueries({ queryKey: ['ticket', selected] }); },
  });

  return (
    <>
      <div className="page-header">
        <h2>פניות (Tickets)</h2>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">כל הסטטוסים</option>
          <option value="OPEN">פתוחה</option>
          <option value="IN_PROGRESS">בטיפול</option>
          <option value="WAITING_CUSTOMER">בהמתנה ללקוח</option>
          <option value="RESOLVED">נפתרה</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>#</th><th>נושא</th><th>סטטוס</th><th>עדיפות</th></tr></thead>
            <tbody>
              {list.data?.items.map((t: any) => (
                <tr key={t.id} onClick={() => setSelected(t.id)} style={{ cursor: 'pointer', background: selected === t.id ? '#eff6ff' : undefined }}>
                  <td>#{t.number}</td>
                  <td>{t.subject}{t.escalatedFromChat && <span className="badge scheduled" style={{ marginRight: 8 }}>מצ׳אט</span>}</td>
                  <td>{t.status}</td>
                  <td>{t.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {detail.data && (
          <div className="card flex-col">
            <h3 style={{ margin: 0 }}>#{detail.data.number} — {detail.data.subject}</h3>
            <div className="muted">{detail.data.description}</div>
            <div className="flex">
              <select value={detail.data.status} onChange={(e) => update.mutate({ status: e.target.value })}>
                {['OPEN','IN_PROGRESS','WAITING_CUSTOMER','RESOLVED','CLOSED'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={detail.data.priority} onChange={(e) => update.mutate({ priority: e.target.value })}>
                {['LOW','NORMAL','HIGH','URGENT'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <h4>תגובות</h4>
            <div className="flex-col" style={{ maxHeight: 320, overflowY: 'auto' }}>
              {detail.data.comments.map((c: any) => (
                <div key={c.id} className="card" style={{ background: c.internal ? '#fef3c7' : '#f8fafc' }}>
                  <div className="muted">{c.author?.name ?? 'מערכת'} • {new Date(c.createdAt).toLocaleString('he-IL')}</div>
                  <div>{c.body}</div>
                </div>
              ))}
            </div>
            <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="תגובה..." />
            <button className="primary" onClick={() => comment.mutate()} disabled={!reply.trim()}>שליחה</button>
          </div>
        )}
      </div>
    </>
  );
}
