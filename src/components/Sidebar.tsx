'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Target, KanbanSquare, Bell, BarChart3, Tag as TagIcon, Home, Building2 } from 'lucide-react';
import { cn } from '~/lib/utils';

const items = [
  { href: '/', label: 'דשבורד', icon: Home },
  { href: '/customers', label: 'לקוחות', icon: Users },
  { href: '/leads', label: 'לידים', icon: Target },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/follow-ups', label: 'תזכורות', icon: Bell },
  { href: '/analytics', label: 'אנליטיקה', icon: BarChart3 },
  { href: '/tags', label: 'תיוגים', icon: TagIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 bg-white border-l border-slate-200 flex-shrink-0 flex flex-col">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-slate-200">
        <Building2 className="w-6 h-6 text-brand-600" />
        <span className="font-bold text-lg">CRM</span>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100',
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 text-xs text-slate-400 border-t border-slate-200">v0.1.0</div>
    </aside>
  );
}
