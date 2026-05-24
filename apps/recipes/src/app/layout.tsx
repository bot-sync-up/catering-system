import './globals.css';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'מטבח ומתכונים',
  description: 'ניהול מתכונים, עלות, הכנה ושיבוץ עובדים',
  manifest: '/manifest.webmanifest'
};
export const viewport: Viewport = {
  themeColor: '#ea580c',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap"
        />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body>
        <header className="no-print bg-white border-b border-stone-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-14">
            <Link href="/" className="font-bold text-lg text-brand-700">מטבח ומתכונים</Link>
            <nav className="flex gap-1 text-sm">
              <Link href="/recipes" className="btn-ghost">מתכונים</Link>
              <Link href="/products" className="btn-ghost">חומרי גלם</Link>
              <Link href="/prep" className="btn-ghost">תכנון הכנה</Link>
              <Link href="/gantt" className="btn-ghost">Gantt</Link>
              <Link href="/staff" className="btn-ghost">ניצול עובדים</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(()=>{}));
          }
        `}} />
      </body>
    </html>
  );
}
