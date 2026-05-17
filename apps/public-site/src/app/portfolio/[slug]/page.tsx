import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { getProject, portfolio } from '@/lib/portfolio-data';

export const dynamicParams = false;

export function generateStaticParams() {
  return portfolio.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const p = getProject(params.slug);
  if (!p) return buildMetadata({ title: 'פרויקט לא נמצא' });
  return buildMetadata({
    title: p.title,
    description: p.excerpt,
    path: `/portfolio/${p.slug}`,
    image: p.cover,
    type: 'article',
  });
}

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const p = getProject(params.slug);
  if (!p) notFound();

  return (
    <article className="section">
      <div className="container-x">
        <nav aria-label="פירורי לחם" className="text-sm text-ink-muted">
          <Link href="/portfolio" className="hover:text-ink">תיק עבודות</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{p.title}</span>
        </nav>
        <header className="mt-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">{p.category}</span>
            <span className="text-xs text-ink-muted">{p.year}</span>
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">{p.title}</h1>
          <p className="mt-3 text-lg text-ink-muted">{p.excerpt}</p>
        </header>
        <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-3xl shadow-soft">
          <Image src={p.cover} alt={p.title} fill sizes="100vw" className="object-cover" priority />
        </div>
        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold">על הפרויקט</h2>
            <p className="mt-3 leading-relaxed text-ink-muted">{p.description}</p>
            {p.images.length > 1 && (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {p.images.slice(1).map((img, i) => (
                  <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                    <Image src={img} alt={`${p.title} — ${i + 2}`} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <aside className="card h-fit">
            <h3 className="text-sm font-semibold text-ink-muted">פרטי פרויקט</h3>
            <dl className="mt-3 space-y-3 text-sm">
              <div><dt className="text-ink-muted">לקוח</dt><dd className="font-medium">{p.client}</dd></div>
              <div><dt className="text-ink-muted">קטגוריה</dt><dd className="font-medium">{p.category}</dd></div>
              <div><dt className="text-ink-muted">שנה</dt><dd className="font-medium">{p.year}</dd></div>
            </dl>
            <h3 className="mt-6 text-sm font-semibold text-ink-muted">מה כולל</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {p.highlights.map((h) => <li key={h} className="flex items-start gap-2"><span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-brand-600" />{h}</li>)}
            </ul>
            <Link href="/contact" className="btn-primary mt-6 w-full">להזמין שירות דומה</Link>
          </aside>
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'בית', path: '/' },
              { name: 'תיק עבודות', path: '/portfolio' },
              { name: p.title, path: `/portfolio/${p.slug}` },
            ]),
          ),
        }}
      />
    </article>
  );
}
