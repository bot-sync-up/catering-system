export default function HomePage() {
  return (
    <div className="card">
      <h2>ברוכים הבאים</h2>
      <p>מערכת ניהול הזמנות — אירועים חד-פעמיים, מנויים קבועים, מנויים חודשיים.</p>
      <ul>
        <li><a href="/orders">צפייה בכל ההזמנות</a></li>
        <li><a href="/orders/new">יצירת הזמנה חדשה</a></li>
        <li><a href="/admin/approvals">אישורי מנהל</a></li>
        <li><a href="/kitchen">לוח מטבח</a></li>
        <li><a href="/waitlist">רשימת המתנה</a></li>
      </ul>
    </div>
  );
}
