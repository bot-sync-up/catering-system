import { Mail, Phone, MapPin } from 'lucide-react';
import { buildMetadata, breadcrumbJsonLd, siteConfig } from '@/lib/seo';
import { ContactForm } from '@/components/contact/ContactForm';

export const metadata = buildMetadata({
  title: 'צור קשר',
  description: 'מלאו טופס קצר ונחזור אליכם תוך יום עסקים. הפנייה נשלחת ישירות ל-CRM שלנו.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <section className="section">
      <div className="container-x grid gap-12 lg:grid-cols-2">
        <div>
          <h1 className="section-title">בואו נדבר</h1>
          <p className="section-subtitle">ספרו לנו על האירוע או הפרויקט. כל פנייה מקבלת מענה אישי.</p>

          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-100 text-brand-700"><Mail size={18} /></span>
              <a href={`mailto:${siteConfig.contact.email}`} className="hover:underline">{siteConfig.contact.email}</a>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-100 text-brand-700"><Phone size={18} /></span>
              <a href={`tel:${siteConfig.contact.phone}`} className="hover:underline">{siteConfig.contact.phone}</a>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-100 text-brand-700"><MapPin size={18} /></span>
              {siteConfig.contact.address}
            </li>
          </ul>

          <div className="mt-10 rounded-3xl bg-surface-muted p-6">
            <h2 className="text-lg font-semibold">שעות פעילות</h2>
            <ul className="mt-3 space-y-1 text-sm text-ink-muted">
              <li>ראשון–חמישי: 09:00–18:00</li>
              <li>שישי: 09:00–13:00</li>
              <li>שבת: סגור</li>
            </ul>
          </div>
        </div>

        <ContactForm />
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'בית', path: '/' },
              { name: 'צור קשר', path: '/contact' },
            ]),
          ),
        }}
      />
    </section>
  );
}
