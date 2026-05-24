'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GalleryItem } from '@/lib/gallery-data';

export function GalleryClient({ items, tags }: { items: GalleryItem[]; tags: readonly string[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  const filtered = useMemo(
    () => (active ? items.filter((i) => i.tags.includes(active)) : items),
    [items, active],
  );

  return (
    <>
      <div role="tablist" aria-label="פילטר תיוגים" className="flex flex-wrap gap-2">
        <button
          role="tab"
          aria-selected={active === null}
          onClick={() => setActive(null)}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition-colors',
            active === null ? 'bg-brand-600 text-white' : 'bg-surface-muted text-ink hover:bg-brand-100',
          )}
        >
          הכל
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            role="tab"
            aria-selected={active === tag}
            onClick={() => setActive(tag)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-colors',
              active === tag ? 'bg-brand-600 text-white' : 'bg-surface-muted text-ink hover:bg-brand-100',
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="masonry mt-8" role="list">
        <AnimatePresence>
          {filtered.map((g) => (
            <motion.button
              key={g.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              role="listitem"
              onClick={() => setLightbox(g)}
              className="group relative w-full overflow-hidden rounded-2xl bg-surface-muted text-right shadow-soft"
              aria-label={`פתח ${g.title} בתצוגה מוגדלת`}
            >
              <Image
                src={g.src}
                alt={g.alt}
                width={g.width}
                height={g.height}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/0 p-4 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <div className="text-sm font-semibold">{g.title}</div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {g.tags.map((t) => (
                    <span key={t} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">{t}</span>
                  ))}
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-modal="true"
            aria-label={lightbox.title}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative max-h-[90vh] max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                aria-label="סגור"
                className="absolute -top-12 right-0 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                onClick={() => setLightbox(null)}
              >
                <X size={20} />
              </button>
              <Image
                src={lightbox.src}
                alt={lightbox.alt}
                width={lightbox.width}
                height={lightbox.height}
                className="max-h-[80vh] w-auto rounded-2xl object-contain"
              />
              <div className="mt-3 rounded-2xl bg-white/95 p-4 text-ink">
                <h3 className="text-lg font-semibold">{lightbox.title}</h3>
                {lightbox.description && <p className="mt-1 text-sm text-ink-muted">{lightbox.description}</p>}
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-ink-muted">
                  <div><dt className="font-semibold text-ink">תאריך</dt><dd>{lightbox.takenAt}</dd></div>
                  {lightbox.location && <div><dt className="font-semibold text-ink">מיקום</dt><dd>{lightbox.location}</dd></div>}
                  {lightbox.photographer && <div><dt className="font-semibold text-ink">צלם</dt><dd>{lightbox.photographer}</dd></div>}
                  <div><dt className="font-semibold text-ink">תגיות</dt><dd>{lightbox.tags.join(', ')}</dd></div>
                </dl>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
