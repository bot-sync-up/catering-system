import Link from 'next/link';

const ITEMS = [
  { href: '/dashboard', label: 'בית', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2h-4v-6h-6v6H5a2 2 0 01-2-2z' },
  { href: '/menu', label: 'תפריט', icon: 'M4 6h16M4 12h16M4 18h16' },
  { href: '/history', label: 'היסטוריה', icon: 'M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/tickets', label: 'פניות', icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' }
];

export default function BottomNav() {
  return (
    <nav className="sticky bottom-0 bg-white border-t border-slate-200">
      <ul className="grid grid-cols-4">
        {ITEMS.map(it => (
          <li key={it.href}>
            <Link href={it.href} className="flex flex-col items-center justify-center py-2 text-xs text-slate-600 hover:text-brand">
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={it.icon} />
              </svg>
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
