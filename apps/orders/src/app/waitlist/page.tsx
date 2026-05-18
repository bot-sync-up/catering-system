import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

export default async function WaitlistPage() {
  const entries = await prisma.waitlist.findMany({
    where: { promoted: false },
    include: { customer: true },
    orderBy: [{ eventDate: 'asc' }, { position: 'asc' }],
  });
  return (
    <div className="card">
      <h2>רשימת המתנה ({entries.length})</h2>
      <table>
        <thead>
          <tr><th>מקום</th><th>לקוח</th><th>אורחים</th><th>תאריך אירוע</th></tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{e.position}</td>
              <td>{e.customer.fullName}</td>
              <td>{e.guestCount}</td>
              <td>{new Date(e.eventDate).toLocaleString('he-IL')}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr><td colSpan={4} className="muted">אין רשומות בהמתנה.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
