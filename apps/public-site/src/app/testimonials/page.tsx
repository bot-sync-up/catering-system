import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { Stars } from '@/components/ui/Stars';
import { Reveal } from '@/components/ui/Reveal';
import { seedTestimonials, publicTestimonials, type Testimonial } from '@/lib/testimonials-data';
import { readJson } from '@/lib/db';
import { TestimonialForm } from '@/components/testimonials/TestimonialForm';
import { formatHebrewDate } from '@/lib/utils';

export const metadata = buildMetadata({
  title: 'המלצות לקוחות',
  description: 'מה לקוחותינו אומרים — המלצות מאומתות עם 4 כוכבים ומעלה.',
  path: '/testimonials',
});

export const dynamic = 'force-dynamic';

export default async function TestimonialsPage() {
  const stored = await readJson<Testimonial[]>('testimonials.json', []);
  const all = [...seedTestimonials, ...stored];
  const visible = publicTestimonials(all);

  const aggregate = visible.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'AggregateRating',
        ratingValue: (visible.reduce((s, t) => s + t.rating, 0) / visible.length).toFixed(1),
        reviewCount: visible.length,
        bestRating: 5,
        worstRating: 1,
      }
    : null;

  const reviewsLd = visible.map((t) => ({
    '@context': 'https://schema.org',
    '@type': 'Review',
    reviewRating: { '@type': 'Rating', ratingValue: t.rating, bestRating: 5 },
    author: { '@type': 'Person', name: t.name },
    reviewBody: t.content,
    datePublished: t.createdAt,
  }));

  return (
    <section className="section">
      <div className="container-x">
        <header className="max-w-2xl">
          <h1 className="section-title">לקוחות מספרים</h1>
          <p className="section-subtitle">המלצות שמתפרסמות לאחר אישור — אמיתיות, מאומתות, ובכבוד.</p>
        </header>

        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((t, i) => (
            <Reveal key={t.id} index={i} as="li">
              <article className="card h-full">
                <Stars value={t.rating} />
                <p className="mt-3 text-ink">"{t.content}"</p>
                <footer className="mt-4 flex items-center justify-between text-sm text-ink-muted">
                  <div>
                    <strong className="block text-ink">{t.name}</strong>
                    {t.role && <span className="text-xs">{t.role}</span>}
                  </div>
                  <time dateTime={t.createdAt} className="text-xs">{formatHebrewDate(t.createdAt)}</time>
                </footer>
              </article>
            </Reveal>
          ))}
        </ul>

        <div className="mt-16 grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">להוסיף המלצה</h2>
            <p className="mt-2 text-ink-muted">השאירו דירוג וטקסט קצר. כל הגשה עוברת מודרציה ידנית לפני פרסום.</p>
          </div>
          <TestimonialForm />
        </div>
      </div>

      {aggregate && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aggregate) }} />
      )}
      {reviewsLd.map((r, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(r) }} />
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'בית', path: '/' },
              { name: 'המלצות', path: '/testimonials' },
            ]),
          ),
        }}
      />
    </section>
  );
}
