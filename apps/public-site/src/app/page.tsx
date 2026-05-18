import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Camera, FileSignature, Sparkles, Star } from 'lucide-react';
import { buildMetadata } from '@/lib/seo';
import { Reveal } from '@/components/ui/Reveal';
import { Stars } from '@/components/ui/Stars';
import { portfolio } from '@/lib/portfolio-data';
import { seedTestimonials, publicTestimonials } from '@/lib/testimonials-data';
import { galleryItems } from '@/lib/gallery-data';

export const metadata = buildMetadata({
  title: 'צילום אירועים, פורטרטים ומיתוג',
  description:
    'סטודיו אמנון — צילום שמספר את הסיפור שלכם. חתונות, בר/בת מצווה, פורטרטים ומסחרי. תיק עבודות, גלריה, וחוזים דיגיטליים בעברית.',
  keywords: ['צלם חתונות', 'צלם בר מצווה', 'סטודיו צילום', 'צילום עסקי', 'מיתוג'],
});

export default function HomePage() {
  const testimonials = publicTestimonials(seedTestimonials).slice(0, 3);
  const featured = portfolio.slice(0, 3);
  const gridImages = galleryItems.slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-bl from-brand-50 via-white to-white" aria-hidden />
        <div className="container-x grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-2">
          <Reveal>
            <div>
              <span className="chip">
                <Sparkles size={14} /> חדש: גלריות לקוח אונליין
              </span>
              <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl lg:text-6xl">
                צילום שמספר את <span className="text-brand-600">הסיפור שלכם</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-ink-muted">
                חתונות, בר/בת מצווה, פורטרטים ומותגים — בעברית, ברגישות ובאיכות גבוהה. תיק עבודות עשיר וחוזה דיגיטלי בלחיצה.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/contact" className="btn-primary">
                  <Camera size={16} /> הזמינו צילום
                </Link>
                <Link href="/portfolio" className="btn-secondary">
                  צפו בתיק עבודות <ArrowLeft size={16} />
                </Link>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
                {[
                  { k: '+200', v: 'אירועים' },
                  { k: '12', v: 'שנות ניסיון' },
                  { k: '4.9', v: 'דירוג ממוצע' },
                ].map((s) => (
                  <div key={s.v}>
                    <dt className="text-2xl font-bold text-ink">{s.k}</dt>
                    <dd className="text-xs text-ink-muted">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
          <Reveal index={1}>
            <div className="relative grid grid-cols-2 gap-3">
              {gridImages.slice(0, 4).map((g, i) => (
                <div
                  key={g.id}
                  className={`relative overflow-hidden rounded-3xl shadow-soft ${i % 3 === 0 ? 'aspect-[3/4]' : 'aspect-square'}`}
                >
                  <Image
                    src={g.src}
                    alt={g.alt}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                    priority={i < 2}
                  />
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Services strip */}
      <section className="section">
        <div className="container-x">
          <Reveal>
            <h2 className="section-title text-center">השירותים שלנו</h2>
            <p className="section-subtitle text-center">חבילות מותאמות לכל סוג אירוע ועסק.</p>
          </Reveal>
          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { t: 'חתונות ואירועים', d: 'תיעוד אינטימי ודוקומנטרי עם דגש על רגעים אמיתיים.', icon: '💍' },
              { t: 'פורטרטים ומשפחה', d: 'סטודיו או בטבע, באור הזהוב, עם הילדים — בלי לחץ.', icon: '👨‍👩‍👧' },
              { t: 'מסחרי ומיתוג', d: 'דיוקני צוות, מוצרים וסיפור ויזואלי שמייצג את המותג.', icon: '🏷️' },
            ].map((s, i) => (
              <Reveal key={s.t} index={i} as="li">
                <div className="card h-full">
                  <div className="text-3xl">{s.icon}</div>
                  <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Featured portfolio */}
      <section className="section bg-surface-muted">
        <div className="container-x">
          <div className="flex items-end justify-between gap-4">
            <Reveal>
              <h2 className="section-title">פרויקטים נבחרים</h2>
              <p className="section-subtitle">לחצו לפרויקט מלא עם סיפור ותמונות.</p>
            </Reveal>
            <Link href="/portfolio" className="hidden text-sm font-semibold text-brand-700 hover:underline md:inline-flex">
              לכל הפרויקטים ←
            </Link>
          </div>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {featured.map((p, i) => (
              <Reveal key={p.slug} index={i} as="li">
                <Link href={`/portfolio/${p.slug}`} className="group block overflow-hidden rounded-3xl bg-white shadow-soft">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={p.cover}
                      alt={p.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <div className="chip">{p.category}</div>
                    <h3 className="mt-3 text-lg font-semibold group-hover:text-brand-700">{p.title}</h3>
                    <p className="mt-1 text-sm text-ink-muted">{p.excerpt}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Testimonials preview */}
      <section className="section">
        <div className="container-x">
          <Reveal>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="section-title">לקוחות מספרים</h2>
                <p className="section-subtitle">המלצות אמיתיות, מאומתות, 4 כוכבים ומעלה.</p>
              </div>
              <Link href="/testimonials" className="hidden text-sm font-semibold text-brand-700 hover:underline md:inline-flex">
                כל ההמלצות ←
              </Link>
            </div>
          </Reveal>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.id} index={i} as="li">
                <article className="card h-full">
                  <Stars value={t.rating} />
                  <p className="mt-3 text-ink">"{t.content}"</p>
                  <footer className="mt-4 text-sm text-ink-muted">
                    <strong className="text-ink">{t.name}</strong>
                    {t.role && <span> — {t.role}</span>}
                  </footer>
                </article>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Contract CTA */}
      <section className="section bg-gradient-to-l from-brand-700 to-brand-500 text-white">
        <div className="container-x grid items-center gap-8 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">חוזה דיגיטלי, בשתי דקות.</h2>
            <p className="mt-3 text-white/80">
              ממלאים פרטים, בוחרים תבנית, חותמים על המסך — וה-PDF נשלח אוטומטית למייל. כולל תזכורות חידוש לפני תום תוקף.
            </p>
          </Reveal>
          <Reveal index={1}>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/contracts" className="btn bg-white text-brand-700 hover:bg-brand-50">
                <FileSignature size={16} /> צרו חוזה
              </Link>
              <Link href="/contact" className="btn bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20">
                דברו איתנו
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
