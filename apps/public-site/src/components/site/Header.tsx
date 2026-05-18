'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'בית' },
  { href: '/portfolio', label: 'תיק עבודות' },
  { href: '/gallery', label: 'גלריה' },
  { href: '/testimonials', label: 'המלצות' },
  { href: '/blog', label: 'בלוג' },
  { href: '/contact', label: 'צור קשר' },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-300',
        scrolled
          ? 'border-b border-black/5 bg-white/85 backdrop-blur-md'
          : 'bg-transparent',
      )}
    >
      <div className="container-x flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <Camera size={18} aria-hidden />
          </span>
          סטודיו אמנון
        </Link>
        <nav className="hidden md:flex items-center gap-1" aria-label="ראשי">
          {NAV.map((n) => {
            const active = pathname === n.href || (n.href !== '/' && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'relative rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'text-brand-700' : 'text-ink-muted hover:text-ink',
                )}
              >
                {n.label}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-brand-600"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
          <Link href="/contact" className="btn-primary mr-2">
            הזמינו צילום
          </Link>
        </nav>
        <button
          aria-label={open ? 'סגור תפריט' : 'פתח תפריט'}
          aria-expanded={open}
          className="md:hidden rounded-xl p-2 text-ink hover:bg-surface-muted"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden overflow-hidden border-t border-black/5 bg-white"
            aria-label="ניווט מובייל"
          >
            <ul className="container-x flex flex-col gap-1 py-3">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className={cn(
                      'block rounded-xl px-3 py-2.5 text-base font-medium',
                      pathname === n.href ? 'bg-brand-50 text-brand-700' : 'text-ink',
                    )}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/contact" className="btn-primary mt-2 w-full">
                  הזמינו צילום
                </Link>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
