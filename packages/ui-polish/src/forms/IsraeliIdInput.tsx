import { forwardRef, useState, useEffect, type ChangeEvent } from 'react';
import { Field, inputBaseClass } from './Field';
import { isValidIsraeliId } from '../utils/hebrew';
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

/** קלט תעודת זהות ישראלית עם ולידציה (אלגוריתם לוהן). */
export const IsraeliIdInput = forwardRef<HTMLInputElement, Props>(function IsraeliIdInput(
  {
    label = 'תעודת זהות',
    value,
    defaultValue = '',
    onChange,
    required,
    hint = '9 ספרות כולל ספרת ביקורת',
    error,
    className,
    name = 'id',
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
    onChange?.(digits, isValidIsraeliId(digits));
  };

  const showError = touched && internal.length === 9 && !isValidIsraeliId(internal);
  const finalError = error ?? (showError ? 'מספר תעודת הזהות אינו תקין' : undefined);

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
