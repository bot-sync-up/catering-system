import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'ניהול הזמנות',
  description: 'מערכת ניהול הזמנות, אירועים, מטבח ומשלוחים',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <header className="topbar">
          <h1>ניהול הזמנות</h1>
          <nav>
            <a href="/orders">הזמנות</a>
            <a href="/orders/new">הזמנה חדשה</a>
            <a href="/admin/approvals">אישורים</a>
            <a href="/kitchen">מטבח</a>
            <a href="/waitlist">המתנה</a>
          </nav>
        </header>
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
