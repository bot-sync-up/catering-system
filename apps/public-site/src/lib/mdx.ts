import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  cover?: string;
  tags?: string[];
  author?: string;
  readingMinutes: number;
};

export type BlogPost = BlogPostMeta & { content: string };

function estimateReading(text: string) {
  const words = text.replace(/[^א-תa-zA-Z\s]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function getAllPosts(): Promise<BlogPostMeta[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(BLOG_DIR);
  } catch {
    return [];
  }
  const posts: BlogPostMeta[] = [];
  for (const file of files) {
    if (!file.endsWith('.mdx') && !file.endsWith('.md')) continue;
    const slug = file.replace(/\.mdx?$/, '');
    const raw = await fs.readFile(path.join(BLOG_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    posts.push({
      slug,
      title: data.title ?? slug,
      description: data.description ?? '',
      publishedAt: data.publishedAt ?? new Date().toISOString(),
      cover: data.cover,
      tags: data.tags ?? [],
      author: data.author,
      readingMinutes: estimateReading(content),
    });
  }
  return posts.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
    const raw = await fs.readFile(filePath, 'utf8').catch(async () => {
      return fs.readFile(path.join(BLOG_DIR, `${slug}.md`), 'utf8');
    });
    const { data, content } = matter(raw);
    return {
      slug,
      title: data.title ?? slug,
      description: data.description ?? '',
      publishedAt: data.publishedAt ?? new Date().toISOString(),
      cover: data.cover,
      tags: data.tags ?? [],
      author: data.author,
      readingMinutes: estimateReading(content),
      content,
    };
  } catch {
    return null;
  }
}
