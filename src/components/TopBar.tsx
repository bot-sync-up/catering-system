'use client';
import { trpc } from '~/lib/trpc-client';
import { initials } from '~/lib/utils';
import { Search } from 'lucide-react';

export function TopBar() {
  const { data: me } = trpc.user.me.useQuery();
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          placeholder="חיפוש לקוח / ליד..."
          className="input pr-9"
        />
      </div>
      <div className="flex items-center gap-3">
        {me ? (
          <>
            <div className="text-sm text-right">
              <div className="font-medium">{me.name}</div>
              <div className="text-xs text-slate-500">{me.role}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-brand-600 text-white grid place-items-center font-semibold">
              {initials(me.name)}
            </div>
          </>
        ) : (
          <span className="text-sm text-slate-500">לא מחובר</span>
        )}
      </div>
    </header>
  );
}
