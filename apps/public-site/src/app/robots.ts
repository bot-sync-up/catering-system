import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/api/', '/admin/', '/contracts/sign/'] },
    ],
    sitemap: `${siteConfig.url.replace(/\/$/, '')}/sitemap.xml`,
    host: siteConfig.url,
  };
}
