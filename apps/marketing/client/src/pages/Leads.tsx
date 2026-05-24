import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function Leads() {
  const [q, setQ] = useState('');
  const leads = useQuery({
    queryKey: ['leads', q],
    queryFn: async () => (await api.get('/leads', { params: { q } })).data,
  });

  return (
    <>
      <div className="page-header">
        <h2>לידים</h2>
        <div className="flex">
          <input style={{ width: 280 }} placeholder="חיפוש לפי שם / אימייל / טלפון" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>שם</th><th>אימייל</th><th>טלפון</th><th>סטטוס</th><th>תגיות</th><th>נוצר</th></tr></thead>
          <tbody>
            {leads.data?.items.map((l: any) => (
              <tr key={l.id}>
                <td>{[l.firstName, l.lastName].filter(Boolean).join(' ') || '—'}</td>
                <td>{l.email ?? '—'}</td>
                <td>{l.phone ?? '—'}</td>
                <td><span className={`badge ${l.status?.toLowerCase()}`}>{l.status}</span></td>
                <td>{(l.tags ?? []).join(', ')}</td>
                <td>{new Date(l.createdAt).toLocaleDateString('he-IL')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
