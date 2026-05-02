import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loyaltyApi, customersApi } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';

const TIER_LABEL = { BRONZE: 'ארד', SILVER: 'כסף', GOLD: 'זהב', PLATINUM: 'פלטינום' };
const TIER_COLOR = { BRONZE: 'bronze', SILVER: 'silver', GOLD: 'gold', PLATINUM: 'platinum' };

export default function Loyalty() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [adjustment, setAdjustment] = useState({ points: 0, reason: '' });

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });
  const { data: tiers = [] } = useQuery({ queryKey: ['loyalty-tiers'], queryFn: loyaltyApi.tiers });
  const { data: customerData } = useQuery({
    queryKey: ['loyalty', selected],
    queryFn: () => loyaltyApi.customer(selected),
    enabled: !!selected,
  });

  const adjM = useMutation({
    mutationFn: () => loyaltyApi.adjust(selected, { points: Number(adjustment.points), reason: adjustment.reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loyalty', selected] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      setAdjustment({ points: 0, reason: '' });
    },
  });

  const updateTierM = useMutation({
    mutationFn: ({ tier, data }) => loyaltyApi.updateTier(tier, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loyalty-tiers'] }),
  });

  return (
    <div>
      <PageHeader title="תכנית נאמנות" subtitle="ניהול נקודות, רמות והטבות" />

      <div className="card">
        <div className="card-title">הגדרות רמות</div>
        <table className="table">
          <thead>
            <tr><th>רמה</th><th>נקודות מינימום</th><th>כפל צבירה</th><th>הנחה %</th><th></th></tr>
          </thead>
          <tbody>
            {tiers.map(t => (
              <tr key={t.id}>
                <td><span className={`badge badge-${TIER_COLOR[t.tier]}`}>{TIER_LABEL[t.tier]}</span></td>
                <td><input type="number" className="form-input" defaultValue={t.minPoints} id={`min-${t.tier}`} style={{ width: 100 }} /></td>
                <td><input type="number" step="0.1" className="form-input" defaultValue={t.pointsMultiplier} id={`mult-${t.tier}`} style={{ width: 80 }} /></td>
                <td><input type="number" className="form-input" defaultValue={t.discountPercent} id={`disc-${t.tier}`} style={{ width: 80 }} /></td>
                <td>
                  <button className="btn btn-primary btn-sm" onClick={() => updateTierM.mutate({
                    tier: t.tier,
                    data: {
                      minPoints: Number(document.getElementById(`min-${t.tier}`).value),
                      pointsMultiplier: Number(document.getElementById(`mult-${t.tier}`).value),
                      discountPercent: Number(document.getElementById(`disc-${t.tier}`).value),
                    },
                  })}>שמור</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">לקוחות</div>
          <select className="form-select" value={selected || ''} onChange={e => setSelected(e.target.value)}>
            <option value="">בחר לקוח</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.loyaltyPoints} נק' ({TIER_LABEL[c.loyaltyTier]})
              </option>
            ))}
          </select>
        </div>

        {customerData && (
          <div className="card">
            <div className="card-title">{customerData.customer.name}</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div className="stat-card" style={{ flex: 1 }}>
                <div className="stat-label">נקודות נוכחיות</div>
                <div className="stat-value">{customerData.customer.loyaltyPoints}</div>
              </div>
              <div className="stat-card" style={{ flex: 1 }}>
                <div className="stat-label">רמה</div>
                <div className="stat-value">
                  <span className={`badge badge-${TIER_COLOR[customerData.customer.loyaltyTier]}`}>
                    {TIER_LABEL[customerData.customer.loyaltyTier]}
                  </span>
                </div>
              </div>
            </div>
            {customerData.nextTier && (
              <div style={{ marginTop: 12, padding: 12, background: '#f9fafb', borderRadius: 8 }}>
                עוד <strong>{customerData.pointsToNext}</strong> נקודות לרמה {TIER_LABEL[customerData.nextTier.tier]}
              </div>
            )}
            <div style={{ marginTop: 16, padding: 16, background: '#fef3c7', borderRadius: 8 }}>
              <strong>התאמה ידנית:</strong>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input type="number" className="form-input" placeholder="נקודות (+/-)" value={adjustment.points}
                  onChange={e => setAdjustment({ ...adjustment, points: e.target.value })} />
                <input className="form-input" placeholder="סיבה" value={adjustment.reason}
                  onChange={e => setAdjustment({ ...adjustment, reason: e.target.value })} />
                <button className="btn btn-primary" onClick={() => adjM.mutate()}>החל</button>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <strong>היסטוריה:</strong>
              <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8 }}>
                {customerData.customer.loyaltyHistory.map(h => (
                  <div key={h.id} style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div>{h.reason || h.type}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(h.createdAt).toLocaleString('he-IL')}</div>
                    </div>
                    <div style={{ color: h.points > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                      {h.points > 0 ? '+' : ''}{h.points}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
