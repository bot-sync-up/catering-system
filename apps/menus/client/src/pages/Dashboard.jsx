import { useQuery } from '@tanstack/react-query';
import { menusApi, itemsApi, packagesApi, ordersApi, couponsApi, customersApi } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import { fmt } from '../components/Currency.jsx';

export default function Dashboard() {
  const menus = useQuery({ queryKey: ['menus'], queryFn: menusApi.list });
  const items = useQuery({ queryKey: ['items'], queryFn: itemsApi.list });
  const packages = useQuery({ queryKey: ['packages'], queryFn: packagesApi.list });
  const orders = useQuery({ queryKey: ['orders'], queryFn: ordersApi.list });
  const coupons = useQuery({ queryKey: ['coupons'], queryFn: couponsApi.list });
  const customers = useQuery({ queryKey: ['customers'], queryFn: customersApi.list });

  const totalRevenue = (orders.data || [])
    .filter(o => o.status === 'CONFIRMED' || o.status === 'COMPLETED')
    .reduce((s, o) => s + (o.total || 0), 0);

  const stats = [
    { label: 'תפריטים פעילים', value: menus.data?.filter(m => m.isActive).length ?? 0, icon: '🍽️' },
    { label: 'מנות בקטלוג', value: items.data?.length ?? 0, icon: '🥘' },
    { label: 'חבילות', value: packages.data?.length ?? 0, icon: '🎁' },
    { label: 'לקוחות', value: customers.data?.length ?? 0, icon: '👥' },
    { label: 'הזמנות', value: orders.data?.length ?? 0, icon: '🛒' },
    { label: 'קופונים פעילים', value: coupons.data?.filter(c => c.isActive).length ?? 0, icon: '🎟️' },
    { label: 'הכנסות מאושרות', value: fmt(totalRevenue), icon: '💰', isText: true },
    { label: 'אורחי VIP', value: customers.data?.filter(c => c.type === 'VIP').length ?? 0, icon: '⭐' },
  ];

  return (
    <div>
      <PageHeader title="ברוכים הבאים" subtitle="סקירה כללית של המערכת" />

      <div className="grid grid-4">
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="stat-label">{s.label}</div>
              <div style={{ fontSize: 22 }}>{s.icon}</div>
            </div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginTop: 24 }}>
        <div className="card">
          <div className="card-title">הזמנות אחרונות</div>
          {(orders.data || []).slice(0, 5).map(o => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{o.orderNumber}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{o.customer?.name || '—'}</div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600 }}>{fmt(o.total)}</div>
                <span className={`badge badge-${o.status === 'CONFIRMED' ? 'success' : o.status === 'CANCELLED' ? 'danger' : 'warning'}`}>
                  {o.status}
                </span>
              </div>
            </div>
          ))}
          {(orders.data?.length ?? 0) === 0 && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 16 }}>אין הזמנות</div>}
        </div>

        <div className="card">
          <div className="card-title">קופונים נפוצים</div>
          {(coupons.data || []).slice(0, 5).map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{c.code}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{c.name}</div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ color: '#6d28d9', fontWeight: 600 }}>
                  {c.type === 'PERCENTAGE' ? `${c.value}%` : fmt(c.value)}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{c._count?.usages || 0} שימושים</div>
              </div>
            </div>
          ))}
          {(coupons.data?.length ?? 0) === 0 && <div style={{ color: '#9ca3af', textAlign: 'center', padding: 16 }}>אין קופונים</div>}
        </div>
      </div>
    </div>
  );
}
