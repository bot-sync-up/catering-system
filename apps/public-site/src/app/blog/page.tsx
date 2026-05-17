import Link from 'next/link';
import Image from 'next/image';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { getAllPosts } from '@/lib/mdx';
import { formatHebrewDate } from '@/lib/utils';
import { Reveal } from '@/components/ui/Reveal';

export const metadata = buildMetadata({
  title: 'בלוג',
  description: 'טיפים, סיפורים מאחורי הקלעים ועדכונים מהסטודיו.',
  path: '/blog',
});

export const revalidate = 3600;

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  return (
    <section className="section">
      <div className="container-x">
        <header className="max-w-2xl">
          <h1 className="section-title">בלוג</h1>
          <p className="section-subtitle">טיפים, סיפורים מאחורי הקלעים ועדכונים מהסטודיו.</p>
        </header>

        {posts.length === 0 ? (
          <p className="mt-10 text-ink-muted">אין פוסטים עדיין. בקרוב!</p>
        ) : (
          <ul className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p, i) => (
              <Reveal key={p.slug} index={i} as="li">
                <Link href={`/blog/${p.slug}`} className="group block overflow-hidden rounded-3xl bg-white shadow-soft">
                  {p.cover && (
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image src={p.cover} alt={p.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-ink-muted">
                      <time dateTime={p.publishedAt}>{formatHebrewDate(p.publishedAt)}</time>
                      <span>•</span>
                      <span>{p.readingMinutes} דק׳ קריאה</span>
                    </div>
                    <h2 className="mt-2 text-lg font-semibold group-hover:text-brand-700">{p.title}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{p.description}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </ul>
        )}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'בית', path: '/' },
              { name: 'בלוג', path: '/blog' },
            ]),
          ),
        }}
      />
    </section>
  );
}
