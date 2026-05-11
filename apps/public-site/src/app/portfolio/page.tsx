import Link from 'next/link';
import Image from 'next/image';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { portfolio } from '@/lib/portfolio-data';
import { Reveal } from '@/components/ui/Reveal';

export const metadata = buildMetadata({
  title: 'תיק עבודות',
  description: 'פרויקטים נבחרים: חתונות, מסחרי, אירועים עסקיים, פורטרטים ומשפחה.',
  path: '/portfolio',
});

export default function PortfolioPage() {
  return (
    <section className="section">
      <div className="container-x">
        <header className="max-w-2xl">
          <h1 className="section-title">תיק עבודות</h1>
          <p className="section-subtitle">כל פרויקט מספר סיפור — לחצו לקריאה ולתמונות נוספות.</p>
        </header>
        <ul className="mt-10 grid gap-8 md:grid-cols-2">
          {portfolio.map((p, i) => (
            <Reveal key={p.slug} index={i} as="li">
              <Link href={`/portfolio/${p.slug}`} className="group block overflow-hidden rounded-3xl bg-white shadow-soft">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={p.cover}
                    alt={p.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between text-xs text-ink-muted">
                    <span className="chip">{p.category}</span>
                    <span>{p.year}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold group-hover:text-brand-700">{p.title}</h2>
                  <p className="mt-2 text-sm text-ink-muted">{p.excerpt}</p>
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
              { name: 'תיק עבודות', path: '/portfolio' },
            ]),
          ),
        }}
      />
    </section>
  );
}
