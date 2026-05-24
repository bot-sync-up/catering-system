import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

export default async function KitchenPage() {
  const tasks = await prisma.kitchenTask.findMany({
    where: { status: { in: ['TODO', 'IN_PROGRESS'] } },
    include: { order: { include: { customer: true } } },
    orderBy: { dueAt: 'asc' },
  });
  return (
    <div className="card">
      <h2>לוח מטבח ({tasks.length})</h2>
      <table>
        <thead>
          <tr><th>הזמנה</th><th>משימה</th><th>סטטוס</th><th>יעד</th></tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td><a href={`/orders/${t.orderId}`}>{t.order.orderNumber}</a></td>
              <td>
                <strong>{t.title}</strong>
                {t.description && <div className="muted">{t.description}</div>}
              </td>
              <td>{t.status}</td>
              <td>{t.dueAt ? new Date(t.dueAt).toLocaleString('he-IL') : '—'}</td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr><td colSpan={4} className="muted">אין משימות פתוחות.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
