import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { buildMetadata, articleJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { getAllPosts, getPost } from '@/lib/mdx';
import { formatHebrewDate } from '@/lib/utils';

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) return buildMetadata({ title: 'פוסט לא נמצא' });
  return buildMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    image: post.cover,
    type: 'article',
    publishedAt: post.publishedAt,
    keywords: post.tags,
  });
}

const mdxComponents = {
  h2: (props: any) => <h2 className="mt-10 text-2xl font-bold" {...props} />,
  h3: (props: any) => <h3 className="mt-8 text-xl font-semibold" {...props} />,
  p: (props: any) => <p className="mt-4 leading-relaxed text-ink" {...props} />,
  a: (props: any) => <a className="text-brand-700 underline-offset-2 hover:underline" {...props} />,
  ul: (props: any) => <ul className="mt-4 list-disc space-y-2 pr-6" {...props} />,
  ol: (props: any) => <ol className="mt-4 list-decimal space-y-2 pr-6" {...props} />,
  blockquote: (props: any) => <blockquote className="my-6 border-r-4 border-brand-300 bg-brand-50 px-4 py-2 text-ink-muted" {...props} />,
  code: (props: any) => <code className="rounded bg-surface-muted px-1.5 py-0.5 text-sm" {...props} />,
};

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  return (
    <article className="section">
      <div className="container-x">
        <nav aria-label="פירורי לחם" className="text-sm text-ink-muted">
          <Link href="/blog" className="hover:text-ink">בלוג</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{post.title}</span>
        </nav>
        <header className="mt-4 max-w-3xl">
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <time dateTime={post.publishedAt}>{formatHebrewDate(post.publishedAt)}</time>
            <span>•</span>
            <span>{post.readingMinutes} דק׳ קריאה</span>
            {post.author && <><span>•</span><span>{post.author}</span></>}
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">{post.title}</h1>
          <p className="mt-3 text-lg text-ink-muted">{post.description}</p>
          {post.tags && post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {post.tags.map((t) => <span key={t} className="chip">{t}</span>)}
            </div>
          )}
        </header>
        {post.cover && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-3xl shadow-soft">
            <Image src={post.cover} alt={post.title} fill sizes="100vw" className="object-cover" priority />
          </div>
        )}
        <div className="prose-rtl mx-auto mt-10 max-w-3xl">
          <MDXRemote
            source={post.content}
            components={mdxComponents}
            options={{ mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] } }}
          />
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            articleJsonLd({
              title: post.title,
              description: post.description,
              slug: post.slug,
              publishedAt: post.publishedAt,
              image: post.cover,
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'בית', path: '/' },
              { name: 'בלוג', path: '/blog' },
              { name: post.title, path: `/blog/${post.slug}` },
            ]),
          ),
        }}
      />
    </article>
  );
}
