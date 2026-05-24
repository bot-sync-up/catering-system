import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { ALL_TAGS, galleryItems } from '@/lib/gallery-data';
import { GalleryClient } from '@/components/gallery/GalleryClient';

export const metadata = buildMetadata({
  title: 'גלריה',
  description: 'גלריית תמונות עם פילטר לפי תיוגים: חתונות, בר מצווה, פורטרט, משפחה, מסחרי ועוד.',
  path: '/gallery',
  keywords: ['גלריה', 'תמונות', 'תיוגים', 'צילום'],
});

export default function GalleryPage() {
  const itemsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: 'גלריה — סטודיו אמנון',
    image: galleryItems.map((g) => ({
      '@type': 'ImageObject',
      contentUrl: g.src,
      name: g.title,
      description: g.alt,
      keywords: g.tags.join(', '),
      datePublished: g.takenAt,
      ...(g.location && { contentLocation: g.location }),
    })),
  };

  return (
    <section className="section">
      <div className="container-x">
        <header className="max-w-2xl">
          <h1 className="section-title">גלריה</h1>
          <p className="section-subtitle">מבחר תמונות מתוך הסטודיו. לחצו על תמונה לתצוגה מלאה ומטא־דאטה.</p>
        </header>
        <div className="mt-10">
          <GalleryClient items={galleryItems} tags={ALL_TAGS} />
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemsJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'בית', path: '/' },
              { name: 'גלריה', path: '/gallery' },
            ]),
          ),
        }}
      />
    </section>
  );
}
