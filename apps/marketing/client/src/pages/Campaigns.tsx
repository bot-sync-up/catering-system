import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function Campaigns() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['campaigns'], queryFn: async () => (await api.get('/campaigns')).data });
  const launch = useMutation({
    mutationFn: async (id: string) => (await api.post(`/campaigns/${id}/launch`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  return (
    <>
      <div className="page-header">
        <h2>קמפיינים</h2>
        <Link to="/campaigns/new"><button className="primary">קמפיין חדש</button></Link>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>שם</th><th>ערוץ</th><th>סטטוס</th><th>סגמנט</th><th>תקציב</th><th>עודכן</th><th></th></tr></thead>
          <tbody>
            {list.data?.items.map((c: any) => (
              <tr key={c.id}>
                <td><Link to={`/campaigns/${c.id}`}>{c.name}</Link></td>
                <td>{c.channel}</td>
                <td><span className={`badge ${c.status?.toLowerCase()}`}>{c.status}</span></td>
                <td>{c.segment?.name ?? '—'}</td>
                <td>{c.budget ?? 0} ₪</td>
                <td>{new Date(c.updatedAt).toLocaleDateString('he-IL')}</td>
                <td>
                  {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                    <button className="primary" onClick={() => launch.mutate(c.id)}>הפעלה</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
