import { forwardRef, type InputHTMLAttributes } from 'react';
import { Field, inputBaseClass } from './Field';
import { cn } from '../utils/cn';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'lang' | 'dir'> {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

/** קלט טקסט עברי — lang=he, dir=rtl, פונט עברי. */
export const HebrewInput = forwardRef<HTMLInputElement, Props>(function HebrewInput(
  { label, hint, error, required, className, ...rest },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {(f) => (
        <input
          ref={ref}
          {...f}
          {...rest}
          dir="rtl"
          lang="he"
          className={cn(inputBaseClass, 'font-hebrew', className)}
        />
      )}
    </Field>
  );
});
