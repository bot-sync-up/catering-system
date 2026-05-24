import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type ThemeMode } from './ThemeProvider';
import { cn } from '../utils/cn';

interface Props {
  className?: string;
}

const items: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'בהיר', icon: Sun },
  { mode: 'dark', label: 'כהה', icon: Moon },
  { mode: 'system', label: 'מערכת', icon: Monitor },
];

/** מתג בורר ערכת נושא — בהיר/כהה/מערכת. */
export function ThemeToggle({ className }: Props) {
  const { mode, setMode } = useTheme();
  return (
    <div
      role="group"
      aria-label="בחירת ערכת נושא"
      className={cn('inline-flex rounded-md border border-border bg-surface p-0.5', className)}
    >
      {items.map(({ mode: m, label, icon: Icon }) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          aria-label={label}
          onClick={() => setMode(m)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-sm transition',
            mode === m
              ? 'bg-primary text-primary-fg'
              : 'text-muted hover:bg-border hover:text-text',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
