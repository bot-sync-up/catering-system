import { forwardRef, useState, useEffect, type ChangeEvent } from 'react';
import { Field, inputBaseClass } from './Field';
import { cn } from '../utils/cn';

interface Props {
  label?: string;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  name?: string;
  min?: number;
  max?: number;
  /** מספר ספרות אחרי הנקודה (ברירת מחדל 2). */
  fractionDigits?: number;
}

function formatDisplay(n: number, digits: number): string {
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('he-IL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

/** קלט סכום בשקלים — מציג ₪ ומפריד אלפים. */
export const CurrencyInput = forwardRef<HTMLInputElement, Props>(function CurrencyInput(
  {
    label = 'סכום',
    value,
    defaultValue,
    onChange,
    required,
    hint,
    error,
    className,
    name = 'amount',
    min,
    max,
    fractionDigits = 2,
  },
  ref,
) {
  const [text, setText] = useState<string>(() =>
    value !== undefined
      ? formatDisplay(value, fractionDigits)
      : defaultValue !== undefined
      ? formatDisplay(defaultValue, fractionDigits)
      : '',
  );

  useEffect(() => {
    if (value !== undefined) setText(formatDisplay(value, fractionDigits));
  }, [value, fractionDigits]);

  const handle = (e: ChangeEvent<HTMLInputElement>): void => {
    const raw = e.target.value.replace(/[^\d.,-]/g, '').replace(/,/g, '');
    const num = parseFloat(raw);
    if (!Number.isFinite(num)) {
      setText(raw);
      return;
    }
    let next = num;
    if (typeof min === 'number') next = Math.max(min, next);
    if (typeof max === 'number') next = Math.min(max, next);
    setText(formatDisplay(next, fractionDigits));
    onChange?.(next);
  };

  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {(f) => (
        <div className="relative">
          <span
            aria-hidden
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
          >
            ₪
          </span>
          <input
            ref={ref}
            {...f}
            name={name}
            type="text"
            dir="ltr"
            inputMode="decimal"
            value={text}
            onChange={handle}
            placeholder="0"
            className={cn(inputBaseClass, 'ps-7 text-end tabular-nums', className)}
          />
        </div>
      )}
    </Field>
  );
});
