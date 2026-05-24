import { prisma } from '@/server/db';
import { STATUS_LABELS_HE } from '@/domain/order/statusMap';
import { fromPrismaStatus } from '@/domain/order/statusMap';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: { customer: true },
  });

  return (
    <div className="card">
      <h2>הזמנות ({orders.length})</h2>
      <table>
        <thead>
          <tr>
            <th>מספר</th>
            <th>לקוח</th>
            <th>סוג</th>
            <th>ערוץ</th>
            <th>סכום</th>
            <th>סטטוס</th>
            <th>נוצר</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td><a href={`/orders/${o.id}`}>{o.orderNumber}</a></td>
              <td>{o.customer.fullName}</td>
              <td>{typeLabel(o.type)}</td>
              <td>{channelLabel(o.channel)}</td>
              <td>{o.totalAmount.toFixed(2)} ₪</td>
              <td>
                <span className={`badge badge-${o.status}`}>
                  {STATUS_LABELS_HE[fromPrismaStatus(o.status as never)]}
                </span>
              </td>
              <td>{new Date(o.createdAt).toLocaleDateString('he-IL')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function typeLabel(t: string): string {
  return (
    {
      ONE_TIME_EVENT: 'אירוע חד-פעמי',
      RECURRING_PLAN: 'מנוי קבוע',
      MONTHLY_SUBSCRIPTION: 'מנוי חודשי',
    } as Record<string, string>
  )[t] ?? t;
}

function channelLabel(c: string): string {
  return (
    {
      PORTAL: 'פורטל',
      PHONE: 'טלפון',
      WHATSAPP: 'ווטסאפ',
      AGENT: 'סוכן',
    } as Record<string, string>
  )[c] ?? c;
}
