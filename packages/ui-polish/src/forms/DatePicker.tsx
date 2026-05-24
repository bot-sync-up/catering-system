import { forwardRef, useMemo, useState, useEffect, type ChangeEvent } from 'react';
import { Calendar } from 'lucide-react';
import { Field, inputBaseClass } from './Field';
import { cn } from '../utils/cn';

export type CalendarSystem = 'gregorian' | 'hebrew' | 'both';

interface Props {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (iso: string) => void;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  name?: string;
  /** מערכת תאריך — גרגוריאני, עברי, או שניהם (תצוגה כפולה). */
  calendar?: CalendarSystem;
  min?: string;
  max?: string;
}

/** מעצב תאריך גרגוריאני לעברית — לדוגמה: יום שלישי, 24 במאי 2026. */
function formatGregorianHe(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return iso;
  }
}

/** מחזיר תאריך בלוח העברי (תלוי בזמינות @hebcal/core). אם לא קיים — מחזיר ''. */
async function formatHebrew(iso: string): Promise<string> {
  if (!iso) return '';
  try {
    const mod: any = await import('@hebcal/core').catch(() => null);
    if (!mod?.HDate) return '';
    const d = new Date(iso);
    const h = new mod.HDate(d);
    return h.renderGematriya();
  } catch {
    return '';
  }
}

/** בורר תאריך עם תמיכה בלוח עברי וגרגוריאני (תצוגה כפולה אופציונלית). */
export const DatePicker = forwardRef<HTMLInputElement, Props>(function DatePicker(
  {
    label = 'תאריך',
    value,
    defaultValue,
    onChange,
    required,
    hint,
    error,
    className,
    name = 'date',
    calendar = 'gregorian',
    min,
    max,
  },
  ref,
) {
  const [iso, setIso] = useState(value ?? defaultValue ?? '');
  const [hebrew, setHebrew] = useState('');

  useEffect(() => {
    if (value !== undefined) setIso(value);
  }, [value]);

  useEffect(() => {
    if (calendar === 'gregorian' || !iso) {
      setHebrew('');
      return;
    }
    let cancelled = false;
    formatHebrew(iso).then((s) => {
      if (!cancelled) setHebrew(s);
    });
    return () => {
      cancelled = true;
    };
  }, [iso, calendar]);

  const handle = (e: ChangeEvent<HTMLInputElement>): void => {
    const v = e.target.value;
    setIso(v);
    onChange?.(v);
  };

  const gregDisplay = useMemo(() => formatGregorianHe(iso), [iso]);

  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {(f) => (
        <>
          <div className="relative">
            <Calendar
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
              aria-hidden
            />
            <input
              ref={ref}
              {...f}
              name={name}
              type="date"
              dir="ltr"
              value={iso}
              onChange={handle}
              min={min}
              max={max}
              className={cn(inputBaseClass, 'ps-9', className)}
            />
          </div>
          {iso && (calendar === 'gregorian' || calendar === 'both') && (
            <p className="text-xs text-muted">{gregDisplay}</p>
          )}
          {iso && (calendar === 'hebrew' || calendar === 'both') && hebrew && (
            <p className="text-xs text-muted">תאריך עברי: {hebrew}</p>
          )}
        </>
      )}
    </Field>
  );
});
