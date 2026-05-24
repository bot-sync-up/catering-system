import { forwardRef, useState, useEffect, type ChangeEvent } from 'react';
import { Phone } from 'lucide-react';
import { Field, inputBaseClass } from './Field';
import { formatIsraeliPhone, isValidIsraeliPhone } from '../utils/hebrew';
import { cn } from '../utils/cn';

interface Props {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (raw: string, valid: boolean) => void;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  name?: string;
  placeholder?: string;
}

/** קלט טלפון ישראלי — פורמט אוטומטי וולידציה. */
export const PhoneInput = forwardRef<HTMLInputElement, Props>(function PhoneInput(
  {
    label = 'טלפון',
    value,
    defaultValue = '',
    onChange,
    required,
    hint,
    error,
    className,
    name = 'phone',
    placeholder = '050-123-4567',
  },
  ref,
) {
  const [internal, setInternal] = useState(value ?? defaultValue);
  useEffect(() => {
    if (value !== undefined) setInternal(value);
  }, [value]);

  const handle = (e: ChangeEvent<HTMLInputElement>): void => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    const formatted = formatIsraeliPhone(digits);
    setInternal(formatted);
    onChange?.(digits, isValidIsraeliPhone(digits));
  };

  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {(f) => (
        <div className="relative">
          <Phone
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
            aria-hidden
          />
          <input
            ref={ref}
            {...f}
            name={name}
            type="tel"
            dir="ltr"
            inputMode="tel"
            autoComplete="tel"
            value={internal}
            onChange={handle}
            placeholder={placeholder}
            className={cn(inputBaseClass, 'ps-9 text-end tabular-nums', className)}
          />
        </div>
      )}
    </Field>
  );
});
