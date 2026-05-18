import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function CampaignEditor() {
  const nav = useNavigate();
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const segments = useQuery({ queryKey: ['segments'], queryFn: async () => (await api.get('/segments')).data });
  const templates = useQuery({ queryKey: ['templates'], queryFn: async () => (await api.get('/templates')).data });

  const [c, setC] = useState<any>({
    name: '', channel: 'EMAIL', segmentId: '', goal: '', budget: 0,
    abConfig: { enabled: false, winnerMetric: 'click' },
    variants: [{ templateId: '', label: 'A', weight: 100 }],
  });
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    if (!isNew) {
      (async () => {
        const { data } = await api.get(`/campaigns/${id}`);
        setC({ ...data, variants: data.variants.map((v: any) => ({ ...v, templateId: v.templateId })) });
        const m = await api.get(`/campaigns/${id}/metrics`).then((r) => r.data).catch(() => null);
        setMetrics(m);
      })();
    }
  }, [id]);

  async function save() {
    const payload = {
      name: c.name,
      channel: c.channel,
      segmentId: c.segmentId || undefined,
      goal: c.goal || undefined,
      budget: Number(c.budget) || 0,
      abConfig: c.abConfig,
      variants: c.variants.map((v: any) => ({ templateId: v.templateId, label: v.label, weight: v.weight })),
    };
    if (isNew) {
      const { data } = await api.post('/campaigns', payload);
      nav(`/campaigns/${data.id}`);
    } else {
      await api.post(`/campaigns/${id}/resolve-ab`); // benign — only sets winner when applicable
    }
  }

  function addVariant() {
    const next = String.fromCharCode(64 + c.variants.length + 1);
    setC({ ...c, variants: [...c.variants, { templateId: '', label: next, weight: 50 }],
           abConfig: { ...c.abConfig, enabled: true } });
  }

  return (
    <>
      <div className="page-header"><h2>{isNew ? 'קמפיין חדש' : 'עריכת קמפיין'}</h2></div>
      <div className="card flex-col">
        <input placeholder="שם הקמפיין" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
        <div className="flex">
          <select value={c.channel} onChange={(e) => setC({ ...c, channel: e.target.value })}>
            <option value="EMAIL">אימייל</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
          <select value={c.segmentId} onChange={(e) => setC({ ...c, segmentId: e.target.value })}>
            <option value="">— ללא סגמנט —</option>
            {segments.data?.items.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.memberCount})</option>)}
          </select>
          <input placeholder="תקציב" type="number" value={c.budget} onChange={(e) => setC({ ...c, budget: e.target.value })} />
          <input placeholder="מטרה (UTM campaign)" value={c.goal ?? ''} onChange={(e) => setC({ ...c, goal: e.target.value })} />
        </div>

        <h3 style={{ margin: '12px 0 0' }}>A/B Testing — וריאנטים</h3>
        <div className="flex">
          <label><input type="checkbox" checked={c.abConfig?.enabled ?? false} onChange={(e) => setC({ ...c, abConfig: { ...c.abConfig, enabled: e.target.checked } })} /> אפשר A/B</label>
          {c.abConfig?.enabled && (
            <select value={c.abConfig.winnerMetric ?? 'click'} onChange={(e) => setC({ ...c, abConfig: { ...c.abConfig, winnerMetric: e.target.value } })}>
              <option value="open">מטריקת מנצח: פתיחה</option>
              <option value="click">מטריקת מנצח: הקלקה</option>
              <option value="convert">מטריקת מנצח: המרה</option>
            </select>
          )}
        </div>

        {c.variants.map((v: any, i: number) => (
          <div key={i} className="flex">
            <input style={{ width: 60 }} value={v.label} onChange={(e) => {
              const a = [...c.variants]; a[i] = { ...v, label: e.target.value }; setC({ ...c, variants: a });
            }} />
            <select value={v.templateId} onChange={(e) => {
              const a = [...c.variants]; a[i] = { ...v, templateId: e.target.value }; setC({ ...c, variants: a });
            }}>
              <option value="">— בחר תבנית —</option>
              {templates.data?.items.filter((t: any) => t.channel === c.channel).map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <input type="number" style={{ width: 80 }} value={v.weight} onChange={(e) => {
              const a = [...c.variants]; a[i] = { ...v, weight: Number(e.target.value) }; setC({ ...c, variants: a });
            }} />
            <span className="muted">משקל</span>
            {v.isWinner && <span className="badge running">מנצח</span>}
          </div>
        ))}
        <button onClick={addVariant}>+ וריאנט</button>

        {metrics && (
          <div className="card" style={{ background: '#f8fafc' }}>
            <h4>מדדים</h4>
            <div className="flex" style={{ flexWrap: 'wrap' }}>
              <Stat label="נשלח" value={metrics.sent} />
              <Stat label="פתיחה" value={`${(metrics.openRate * 100).toFixed(1)}%`} />
              <Stat label="הקלקה" value={`${(metrics.clickRate * 100).toFixed(1)}%`} />
              <Stat label="המרה" value={`${(metrics.convRate * 100).toFixed(1)}%`} />
              <Stat label="הסרה" value={metrics.unsub} />
            </div>
          </div>
        )}

        <div className="flex">
          <div className="spacer" />
          <button onClick={() => nav('/campaigns')}>חזרה</button>
          <button className="primary" onClick={save}>{isNew ? 'יצירה' : 'שמירה'}</button>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: any) {
  return (
    <div style={{ minWidth: 100 }}>
      <div className="muted">{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
