import type { Metadata } from 'next';
import { absoluteUrl } from './utils';

export const siteConfig = {
  name: 'סטודיו אמנון — צילום ועיצוב',
  shortName: 'סטודיו אמנון',
  description:
    'סטודיו צילום ועיצוב בעברית, מתמחה בצילום אירועים, פורטרטים ומיתוג עסקי. תיק עבודות, גלריה, וחוזים דיגיטליים.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://example.co.il',
  locale: 'he_IL',
  ogImage: '/og-default.png',
  contact: {
    email: 'studio@example.co.il',
    phone: '+972-50-000-0000',
    address: 'תל אביב, ישראל',
  },
  social: {
    instagram: 'https://instagram.com/example',
    facebook: 'https://facebook.com/example',
  },
};

export function buildMetadata(opts: {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  keywords?: string[];
  type?: 'website' | 'article';
  publishedAt?: string;
}): Metadata {
  const title = opts.title ? `${opts.title} | ${siteConfig.shortName}` : siteConfig.name;
  const description = opts.description ?? siteConfig.description;
  const url = absoluteUrl(opts.path ?? '/');
  const image = opts.image ?? siteConfig.ogImage;

  return {
    metadataBase: new URL(siteConfig.url),
    title,
    description,
    keywords: opts.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: opts.type ?? 'website',
      locale: siteConfig.locale,
      title,
      description,
      url,
      siteName: siteConfig.name,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      ...(opts.publishedAt && { publishedTime: opts.publishedAt }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: siteConfig.name,
    url: siteConfig.url,
    image: absoluteUrl(siteConfig.ogImage),
    description: siteConfig.description,
    telephone: siteConfig.contact.phone,
    email: siteConfig.contact.email,
    address: {
      '@type': 'PostalAddress',
      addressLocality: siteConfig.contact.address,
      addressCountry: 'IL',
    },
    sameAs: [siteConfig.social.instagram, siteConfig.social.facebook],
  };
}

export function articleJsonLd(opts: { title: string; description: string; slug: string; publishedAt: string; image?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    image: opts.image ? [absoluteUrl(opts.image)] : undefined,
    datePublished: opts.publishedAt,
    author: { '@type': 'Organization', name: siteConfig.name },
    publisher: { '@type': 'Organization', name: siteConfig.name },
    mainEntityOfPage: absoluteUrl(`/blog/${opts.slug}`),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}
