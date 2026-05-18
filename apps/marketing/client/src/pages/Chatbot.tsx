import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function Chatbot() {
  const [tab, setTab] = useState<'preview' | 'conversations' | 'faq'>('preview');
  return (
    <>
      <div className="page-header"><h2>צ׳אט-בוט</h2></div>
      <div className="tabs">
        <button className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>חלון בדיקה</button>
        <button className={tab === 'conversations' ? 'active' : ''} onClick={() => setTab('conversations')}>שיחות</button>
        <button className={tab === 'faq' ? 'active' : ''} onClick={() => setTab('faq')}>FAQ</button>
      </div>
      {tab === 'preview' && <ChatPreview />}
      {tab === 'conversations' && <Conversations />}
      {tab === 'faq' && <FaqAdmin />}
    </>
  );
}

function ChatPreview() {
  const [sessionId] = useState(() => `test_${Date.now()}`);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');

  const send = useMutation({
    mutationFn: async (text: string) => (await api.post('/chatbot/web', { sessionId, message: text })).data,
    onSuccess: (data) => setMessages((m) => [...m, { role: 'assistant', content: data.reply }]),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((m) => [...m, { role: 'user', content: input }]);
    send.mutate(input);
    setInput('');
  }

  return (
    <div className="chat-window">
      <div className="chat-msgs">
        {messages.length === 0 && <div className="muted" style={{ textAlign: 'center', padding: 24 }}>שלח/י הודעה כדי לבדוק את הצ׳אט-בוט</div>}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>{m.content}</div>
        ))}
        {send.isPending && <div className="chat-msg assistant" style={{ opacity: 0.6 }}>...</div>}
      </div>
      <form className="chat-input" onSubmit={submit}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="הקלד/י הודעה" />
        <button className="primary" type="submit">שליחה</button>
      </form>
    </div>
  );
}

function Conversations() {
  const { data } = useQuery({ queryKey: ['conversations'], queryFn: async () => (await api.get('/chatbot/conversations')).data });
  return (
    <div className="card">
      <table>
        <thead><tr><th>ערוץ</th><th>ליד</th><th>סטטוס</th><th>הוסלמה?</th><th>עודכן</th></tr></thead>
        <tbody>
          {data?.items?.map((c: any) => (
            <tr key={c.id}>
              <td>{c.channel}</td>
              <td>{c.lead?.firstName ?? c.lead?.phone ?? c.externalId ?? '—'}</td>
              <td>{c.status}</td>
              <td>{c.escalatedTicketId ? 'כן' : 'לא'}</td>
              <td>{new Date(c.updatedAt).toLocaleString('he-IL')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FaqAdmin() {
  const { data, refetch } = useQuery({ queryKey: ['faq'], queryFn: async () => (await api.get('/chatbot/faq')).data });
  const [q, setQ] = useState({ question: '', answer: '', keywords: '', category: '' });
  async function add() {
    await api.post('/chatbot/faq', {
      question: q.question, answer: q.answer, category: q.category || undefined,
      keywords: q.keywords.split(',').map((s) => s.trim()).filter(Boolean),
    });
    setQ({ question: '', answer: '', keywords: '', category: '' });
    refetch();
  }
  return (
    <>
      <div className="card flex-col" style={{ marginBottom: 16 }}>
        <h4>הוספת שאלה</h4>
        <input placeholder="קטגוריה" value={q.category} onChange={(e) => setQ({ ...q, category: e.target.value })} />
        <input placeholder="שאלה" value={q.question} onChange={(e) => setQ({ ...q, question: e.target.value })} />
        <textarea placeholder="תשובה" value={q.answer} onChange={(e) => setQ({ ...q, answer: e.target.value })} />
        <input placeholder="מילות מפתח (מופרדות בפסיק)" value={q.keywords} onChange={(e) => setQ({ ...q, keywords: e.target.value })} />
        <button className="primary" onClick={add}>הוספה</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>קטגוריה</th><th>שאלה</th><th>תשובה</th><th>צפיות</th></tr></thead>
          <tbody>
            {data?.items?.map((f: any) => (
              <tr key={f.id}><td>{f.category ?? '—'}</td><td>{f.question}</td><td>{f.answer.slice(0, 80)}...</td><td>{f.views}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
