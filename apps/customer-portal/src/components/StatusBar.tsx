'use client';

import { STATUS_FLOW, STATUS_LABEL, type OrderStatus } from '@/lib/store';

export default function StatusBar({ status }: { status: OrderStatus }) {
  const idx = STATUS_FLOW.indexOf(status);
  return (
    <ol className="flex items-center justify-between gap-1">
      {STATUS_FLOW.map((s, i) => {
        const done = i <= idx;
        const current = i === idx;
        return (
          <li key={s} className="flex-1 flex flex-col items-center text-center">
            <div
              className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition',
                done ? 'bg-brand text-white' : 'bg-slate-200 text-slate-500',
                current ? 'ring-4 ring-brand/30 scale-110' : ''
              ].join(' ')}
            >
              {i + 1}
            </div>
            <span className={['mt-1 text-[11px]', done ? 'text-brand-dark font-medium' : 'text-slate-500'].join(' ')}>
              {STATUS_LABEL[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
