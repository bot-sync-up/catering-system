import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function Surveys() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['surveys'], queryFn: async () => (await api.get('/surveys')).data });
  const [draft, setDraft] = useState<any | null>(null);

  const save = useMutation({
    mutationFn: async (s: any) => (await api.post('/surveys', s)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['surveys'] }); setDraft(null); },
  });

  return (
    <>
      <div className="page-header">
        <h2>סקרי NPS</h2>
        <button className="primary" onClick={() => setDraft({ name: '', type: 'NPS', question: 'באיזו מידה תמליצ/י לחבר על השירות שלנו? (0-10)', channel: 'EMAIL', trigger: { event: 'purchase', delayMinutes: 60 } })}>סקר חדש</button>
      </div>

      {draft && (
        <div className="card flex-col">
          <input placeholder="שם הסקר" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <textarea placeholder="השאלה" value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
          <div className="flex">
            <select value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })}>
              <option value="EMAIL">אימייל</option>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
            <input placeholder="אירוע טריגר (event type)" value={draft.trigger?.event ?? ''} onChange={(e) => setDraft({ ...draft, trigger: { ...draft.trigger, event: e.target.value } })} />
            <input type="number" placeholder="השהיה (דקות)" value={draft.trigger?.delayMinutes ?? 60} onChange={(e) => setDraft({ ...draft, trigger: { ...draft.trigger, delayMinutes: Number(e.target.value) } })} />
          </div>
          <div className="flex">
            <button onClick={() => setDraft(null)}>ביטול</button>
            <div className="spacer" />
            <button className="primary" onClick={() => save.mutate(draft)}>שמירה</button>
          </div>
        </div>
      )}

      <div className="card">
        <table>
          <thead><tr><th>שם</th><th>סוג</th><th>ערוץ</th><th>פעיל</th><th>תוצאות</th></tr></thead>
          <tbody>
            {list.data?.items.map((s: any) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.type}</td>
                <td>{s.channel}</td>
                <td>{s.active ? 'כן' : 'לא'}</td>
                <td><SurveyResults id={s.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SurveyResults({ id }: { id: string }) {
  const { data } = useQuery({ queryKey: ['survey-results', id], queryFn: async () => (await api.get(`/surveys/${id}/results`)).data });
  if (!data) return <span className="muted">—</span>;
  return <span><b>NPS {data.nps}</b> • {data.total} תשובות</span>;
}
