import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Stars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role="img"
      aria-label={`דירוג ${value} מתוך 5 כוכבים`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < value ? 'fill-yellow-400 text-yellow-400' : 'text-black/15'}
          aria-hidden
        />
      ))}
    </div>
  );
}
