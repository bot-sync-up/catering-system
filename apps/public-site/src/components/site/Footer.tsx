import Link from 'next/link';
import { Instagram, Facebook, Mail, Phone, MapPin } from 'lucide-react';
import { siteConfig } from '@/lib/seo';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-black/5 bg-surface-muted">
      <div className="container-x grid gap-10 py-12 md:grid-cols-4">
        <div>
          <div className="font-display text-lg font-bold">{siteConfig.shortName}</div>
          <p className="mt-2 text-sm text-ink-muted">
            צילום שמספר את הסיפור שלכם — בעברית, ברגישות, ובאיכות גבוהה.
          </p>
          <div className="mt-4 flex gap-2">
            <a aria-label="Instagram" href={siteConfig.social.instagram} className="rounded-xl bg-white p-2 shadow-soft hover:bg-brand-50">
              <Instagram size={18} />
            </a>
            <a aria-label="Facebook" href={siteConfig.social.facebook} className="rounded-xl bg-white p-2 shadow-soft hover:bg-brand-50">
              <Facebook size={18} />
            </a>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">ניווט</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            <li><Link href="/portfolio" className="hover:text-ink">תיק עבודות</Link></li>
            <li><Link href="/gallery" className="hover:text-ink">גלריה</Link></li>
            <li><Link href="/testimonials" className="hover:text-ink">המלצות</Link></li>
            <li><Link href="/blog" className="hover:text-ink">בלוג</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">שירות</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            <li><Link href="/contact" className="hover:text-ink">צור קשר</Link></li>
            <li><Link href="/contracts" className="hover:text-ink">חוזה דיגיטלי</Link></li>
            <li><Link href="/privacy" className="hover:text-ink">פרטיות</Link></li>
            <li><Link href="/terms" className="hover:text-ink">תנאי שירות</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">צרו קשר</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            <li className="flex items-center gap-2"><Mail size={14} /> {siteConfig.contact.email}</li>
            <li className="flex items-center gap-2"><Phone size={14} /> {siteConfig.contact.phone}</li>
            <li className="flex items-center gap-2"><MapPin size={14} /> {siteConfig.contact.address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-black/5">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-4 text-xs text-ink-subtle md:flex-row">
          <span>© {year} {siteConfig.name}. כל הזכויות שמורות.</span>
          <span>נבנה בעברית עם Next.js</span>
        </div>
      </div>
    </footer>
  );
}
