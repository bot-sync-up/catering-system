import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/seo';
import { portfolio } from '@/lib/portfolio-data';
import { getAllPosts } from '@/lib/mdx';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, '');
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/portfolio`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/gallery`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/testimonials`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/contracts`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const projectRoutes: MetadataRoute.Sitemap = portfolio.map((p) => ({
    url: `${base}/portfolio/${p.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const posts = await getAllPosts();
  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...projectRoutes, ...postRoutes];
}
