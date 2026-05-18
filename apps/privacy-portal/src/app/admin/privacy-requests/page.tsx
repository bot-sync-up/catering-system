import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPrivacyRequestsPage() {
  // הגנה אמיתית בפרודקשן: middleware שבודק session/role=admin.
  const [sar, erasure] = await Promise.all([
    prisma.sarRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: true },
    }),
    prisma.erasureRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: true },
    }),
  ]);

  return (
    <section>
      <h1>בקשות פרטיות (ניהול)</h1>

      <h2>בקשות עיון (SAR)</h2>
      <table>
        <thead>
          <tr>
            <th>מס׳</th>
            <th>משתמש</th>
            <th>סטטוס</th>
            <th>נוצרה</th>
            <th>הושלמה</th>
          </tr>
        </thead>
        <tbody>
          {sar.map((s) => (
            <tr key={s.id}>
              <td>{s.id.slice(-6)}</td>
              <td>{s.user.email}</td>
              <td>{s.status}</td>
              <td>{s.createdAt.toLocaleString("he-IL")}</td>
              <td>{s.completedAt?.toLocaleString("he-IL") ?? "—"}</td>
            </tr>
          ))}
          {sar.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">אין בקשות.</td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ marginTop: 24 }}>בקשות מחיקה</h2>
      <table>
        <thead>
          <tr>
            <th>מס׳</th>
            <th>משתמש</th>
            <th>סטטוס</th>
            <th>נוצרה</th>
            <th>הושלמה</th>
          </tr>
        </thead>
        <tbody>
          {erasure.map((e) => (
            <tr key={e.id}>
              <td>{e.id.slice(-6)}</td>
              <td>{e.user.email}</td>
              <td>{e.status}</td>
              <td>{e.createdAt.toLocaleString("he-IL")}</td>
              <td>{e.completedAt?.toLocaleString("he-IL") ?? "—"}</td>
            </tr>
          ))}
          {erasure.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">אין בקשות.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
