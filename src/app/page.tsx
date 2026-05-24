import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [recipes, products, events] = await Promise.all([
    prisma.recipe.count(),
    prisma.product.count(),
    prisma.event.count()
  ]);
  const tiles = [
    { href: '/recipes', title: 'מתכונים', desc: 'ספרייה, גרסאות בסיסי/VIP, diff ו-rollback', count: recipes },
    { href: '/products', title: 'חומרי גלם', desc: 'מוצרים, ספקים ומחירים', count: products },
    { href: '/prep', title: 'תכנון הכנה', desc: 'משימות, תחנות וזמנים', count: events },
    { href: '/gantt', title: 'Gantt', desc: 'תרשים חייבי הכנה', count: '' },
    { href: '/staff', title: 'ניצול עובדים', desc: 'דוח שעות לפי טווח', count: '' }
  ];
  return (
    <div>
      <h1 className="text-3xl font-bold text-stone-900 mb-2">ברוכים הבאים</h1>
      <p className="text-stone-600 mb-6">מערכת ניהול מטבח ומתכונים. בחרו מודול:</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="card hover:shadow-md transition block">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold text-brand-700">{t.title}</h2>
              {t.count !== '' && <span className="tag">{t.count}</span>}
            </div>
            <p className="text-stone-600 mt-1 text-sm">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
