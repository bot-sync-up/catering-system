import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Sidebar } from '~/components/Sidebar';
import { TopBar } from '~/components/TopBar';

export const metadata: Metadata = {
  title: 'CRM',
  description: 'מערכת ניהול לקוחות',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <div className="min-h-screen flex">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0">
              <TopBar />
              <div className="flex-1 p-6">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
