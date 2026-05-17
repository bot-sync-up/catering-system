import Link from 'next/link';
import { FileSignature, ShieldCheck, Clock, RefreshCw } from 'lucide-react';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { TEMPLATES } from '@contracts/core';
import { Reveal } from '@/components/ui/Reveal';

export const metadata = buildMetadata({
  title: 'חוזה דיגיטלי',
  description: 'בחרו תבנית, מלאו פרטים, וחתמו על המסך. ה-PDF נשלח אוטומטית למייל ונשמר באופן מאובטח.',
  path: '/contracts',
});

export default function ContractsPage() {
  return (
    <section className="section">
      <div className="container-x">
        <header className="max-w-2xl">
          <span className="chip"><FileSignature size={14} /> חוזים דיגיטליים</span>
          <h1 className="mt-3 section-title">חוזה ב-2 דקות, מקצועי לחלוטין</h1>
          <p className="section-subtitle">תבניות מותאמות לישראל, חתימה דיגיטלית, ושמירה בענן. עם תזכורות חידוש אוטומטיות.</p>
        </header>

        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: ShieldCheck, t: 'מאובטח', d: 'הצפנה, חתימה מתועדת ב-IP וזמן, אחסון R2.' },
            { icon: Clock, t: 'מהיר', d: 'תבניות מוכנות. אפשר לחתום מהמובייל.' },
            { icon: RefreshCw, t: 'תזכורות חידוש', d: 'מערכת מתזמנת מייל לפני תום תוקף.' },
          ].map((f, i) => (
            <Reveal key={f.t} index={i} as="li">
              <div className="card h-full">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-100 text-brand-700">
                  <f.icon size={18} />
                </span>
                <h3 className="mt-3 font-semibold">{f.t}</h3>
                <p className="mt-1 text-sm text-ink-muted">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </ul>

        <h2 className="mt-16 text-2xl font-bold">בחרו תבנית להתחלה</h2>
        <ul className="mt-6 grid gap-6 md:grid-cols-3">
          {TEMPLATES.map((t, i) => (
            <Reveal key={t.id} index={i} as="li">
              <Link href={`/contracts/new?template=${t.id}`} className="card group block h-full transition-shadow hover:shadow-glow">
                <h3 className="text-lg font-semibold group-hover:text-brand-700">{t.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{t.description}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
                  התחל ←
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'בית', path: '/' },
              { name: 'חוזה דיגיטלי', path: '/contracts' },
            ]),
          ),
        }}
      />
    </section>
  );
}
