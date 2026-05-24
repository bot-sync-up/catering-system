import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import { fmt } from '../components/Currency.jsx';

const STATUS_BADGE = {
  DRAFT: 'warning',
  CONFIRMED: 'success',
  COMPLETED: 'primary',
  CANCELLED: 'danger',
};
const STATUS_LABEL = {
  DRAFT: 'טיוטה',
  CONFIRMED: 'מאושר',
  COMPLETED: 'הושלם',
  CANCELLED: 'בוטל',
};

export default function Orders() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [report, setReport] = useState(null);

  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: ordersApi.list });

  const confirmM = useMutation({
    mutationFn: (id) => ordersApi.confirm(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
  const cancelM = useMutation({
    mutationFn: (id) => ordersApi.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });

  const showReport = async (id) => {
    const r = await ordersApi.allergyReport(id);
    setReport(r);
  };

  return (
    <div>
      <PageHeader
        title="הזמנות"
        actions={<button className="btn btn-primary" onClick={() => nav('/order-builder')}>+ הזמנה חדשה</button>}
      />

      <table className="table">
        <thead>
          <tr><th>מספר</th><th>לקוח</th><th>תאריך אירוע</th><th>אורחים</th><th>סכום</th><th>סטטוס</th><th></th></tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id}>
              <td><strong style={{ fontFamily: 'monospace' }}>{o.orderNumber}</strong></td>
              <td>{o.customer?.name || '—'}</td>
              <td>{o.eventDate ? new Date(o.eventDate).toLocaleDateString('he-IL') : '—'}</td>
              <td>{o.guestCount}</td>
              <td><strong>{fmt(o.total)}</strong></td>
              <td><span className={`badge badge-${STATUS_BADGE[o.status]}`}>{STATUS_LABEL[o.status]}</span></td>
              <td>
                {o.status === 'DRAFT' && (
                  <button className="btn btn-success btn-sm" onClick={() => confirmM.mutate(o.id)}>אשר</button>
                )}
                {(o.status === 'DRAFT' || o.status === 'CONFIRMED') && (
                  <button className="btn btn-danger btn-sm" onClick={() => confirm('לבטל?') && cancelM.mutate(o.id)}>בטל</button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => showReport(o.id)}>אלרגיות</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {report && (
        <Modal title={`דוח אלרגיות`} onClose={() => setReport(null)}>
          <div className="form-group">
            <strong>סה"כ אורחים:</strong> {report.guestCount}
          </div>
          <div className="form-group">
            <strong>אלרגיות באורחים:</strong>
            <div>
              {Object.entries(report.allergiesSummary).map(([name, count]) => (
                <span key={name} className="chip chip-allergy">{name}: {count}</span>
              ))}
              {Object.keys(report.allergiesSummary).length === 0 && <em> אין</em>}
            </div>
          </div>
          <div className="form-group">
            <strong>דיאטות באורחים:</strong>
            <div>
              {Object.entries(report.dietsSummary).map(([name, count]) => (
                <span key={name} className="chip chip-diet">{name}: {count}</span>
              ))}
              {Object.keys(report.dietsSummary).length === 0 && <em> אין</em>}
            </div>
          </div>
          {report.conflicts.length > 0 && (
            <div className="form-group">
              <strong style={{ color: '#ef4444' }}>⚠️ אזהרות:</strong>
              {report.conflicts.map((c, i) => (
                <div key={i} style={{ padding: 8, background: '#fee2e2', borderRadius: 6, marginTop: 4 }}>
                  <strong>{c.guestName}</strong> - {c.menuItem}: {c.reasons.join(', ')}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
