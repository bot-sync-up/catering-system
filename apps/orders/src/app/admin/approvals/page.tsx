import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  const pending = await prisma.order.findMany({
    where: { status: 'PENDING' },
    include: { customer: true, items: true },
    orderBy: { createdAt: 'asc' },
  });
  return (
    <div className="card">
      <h2>אישורי מנהל ({pending.length})</h2>
      <table>
        <thead>
          <tr><th>מספר</th><th>לקוח</th><th>סכום</th><th>תאריך אירוע</th><th></th></tr>
        </thead>
        <tbody>
          {pending.map((o) => (
            <tr key={o.id}>
              <td><a href={`/orders/${o.id}`}>{o.orderNumber}</a></td>
              <td>{o.customer.fullName}</td>
              <td>{o.totalAmount.toFixed(2)} ₪</td>
              <td>{o.eventDate ? new Date(o.eventDate).toLocaleString('he-IL') : '—'}</td>
              <td><a href={`/orders/${o.id}`} className="btn">לפתוח</a></td>
            </tr>
          ))}
          {pending.length === 0 && (
            <tr><td colSpan={5} className="muted">אין הזמנות ממתינות.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
