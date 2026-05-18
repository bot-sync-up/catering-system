import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "פורטל פרטיות",
  description: "ניהול נתונים אישיים — תיקון 13 לחוק הגנת הפרטיות",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <header className="topbar">
          <a href="/">פורטל פרטיות</a>
          <nav>
            <a href="/portal/my-data">המידע שלי</a>
            <a href="/portal/erasure">מחיקה</a>
            <a href="/portal/consents">הסכמות</a>
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="footer">
          <small>בהתאם לחוק הגנת הפרטיות (תיקון 13), אוגוסט 2025</small>
        </footer>
      </body>
    </html>
  );
}
