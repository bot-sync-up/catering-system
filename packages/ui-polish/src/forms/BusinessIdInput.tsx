import { forwardRef, useState, useEffect, type ChangeEvent } from 'react';
import { Field, inputBaseClass } from './Field';
import { isValidBusinessId } from '../utils/hebrew';
import { cn } from '../utils/cn';

interface Props {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (id: string, valid: boolean) => void;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  name?: string;
}

/** קלט ח.פ / עוסק מורשה — 9 ספרות עם ולידציה. */
export const BusinessIdInput = forwardRef<HTMLInputElement, Props>(function BusinessIdInput(
  {
    label = 'ח.פ / עוסק מורשה',
    value,
    defaultValue = '',
    onChange,
    required,
    hint = '9 ספרות',
    error,
    className,
    name = 'business_id',
  },
  ref,
) {
  const [internal, setInternal] = useState(value ?? defaultValue);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (value !== undefined) setInternal(value);
  }, [value]);

  const handle = (e: ChangeEvent<HTMLInputElement>): void => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
    setInternal(digits);
    onChange?.(digits, isValidBusinessId(digits));
  };

  const showError = touched && internal.length === 9 && !isValidBusinessId(internal);
  const finalError = error ?? (showError ? 'מספר ח.פ אינו תקין' : undefined);

  return (
    <Field label={label} hint={hint} error={finalError} required={required}>
      {(f) => (
        <input
          ref={ref}
          {...f}
          name={name}
          type="text"
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          maxLength={9}
          value={internal}
          onChange={handle}
          onBlur={() => setTouched(true)}
          placeholder="000000000"
          className={cn(inputBaseClass, 'text-end tabular-nums', className)}
        />
      )}
    </Field>
  );
});
